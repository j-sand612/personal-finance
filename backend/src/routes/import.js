const express = require('express');
const router = express.Router();
const db = require('../db/database');

const VALID_SECTIONS = ['wants', 'needs', 'savings'];
const VALID_TYPES    = ['paycheck', 'stock_bonus', 'performance_bonus', 'misc'];

function parseCsvLine(line) {
  const result = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') inQuotes = false;
      else cur += ch;
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ',') { result.push(cur); cur = ''; }
      else cur += ch;
    }
  }
  result.push(cur);
  return result;
}

function parseCsv(text) {
  const lines = text.trim().split('\n').map((l) => l.replace(/\r$/, ''));
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]).map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const obj = {};
    headers.forEach((h, i) => { obj[h] = values[i] ?? ''; });
    return obj;
  });
}

// POST /api/import/month/:monthId
// Body: text/plain — a CSV exported by GET /api/export/month/:monthId
// Appends rows to the month (does not clear existing data first).
router.post('/month/:monthId', (req, res) => {
  const monthId = Number(req.params.monthId);
  const month = db.prepare('SELECT * FROM months WHERE id = ?').get(monthId);
  if (!month) return res.status(404).json({ error: 'Month not found' });

  const csvText = req.body;
  if (!csvText || typeof csvText !== 'string') {
    return res.status(400).json({ error: 'Request body must be CSV text (Content-Type: text/plain)' });
  }

  const rows = parseCsv(csvText);
  const errors = [];
  let incomeCount = 0;
  let expenseCount = 0;

  const insertIncome = db.prepare(
    'INSERT INTO income (month_id, type, amount, description, date) VALUES (?, ?, ?, ?, ?)'
  );
  const insertExpense = db.prepare(
    'INSERT INTO expenses (month_id, section, category, detail, amount, date) VALUES (?, ?, ?, ?, ?, ?)'
  );

  db.exec('BEGIN');
  try {
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const lineNum = i + 2; // +1 for header row, +1 for 1-based display

      if (r.record_type === 'income') {
        if (!VALID_TYPES.includes(r.category)) {
          errors.push(`Row ${lineNum}: invalid income type "${r.category}"`);
          continue;
        }
        const amount = parseFloat(r.amount);
        if (isNaN(amount)) { errors.push(`Row ${lineNum}: invalid amount "${r.amount}"`); continue; }
        insertIncome.run(monthId, r.category, amount, r.description || null, r.date || null);
        incomeCount++;
      } else if (r.record_type === 'expense') {
        if (!VALID_SECTIONS.includes(r.section)) {
          errors.push(`Row ${lineNum}: invalid section "${r.section}"`);
          continue;
        }
        if (!r.category) { errors.push(`Row ${lineNum}: category required`); continue; }
        const amount = parseFloat(r.amount);
        if (isNaN(amount)) { errors.push(`Row ${lineNum}: invalid amount "${r.amount}"`); continue; }
        insertExpense.run(monthId, r.section, r.category, r.description || null, amount, r.date || null);
        expenseCount++;
      } else {
        errors.push(`Row ${lineNum}: unknown record_type "${r.record_type}"`);
      }
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  res.json({ imported: { income: incomeCount, expenses: expenseCount }, errors });
});

module.exports = router;
