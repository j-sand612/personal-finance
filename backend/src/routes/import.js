const express = require('express');
const router = express.Router();
const db = require('../db/database');

const VALID_SECTIONS = ['wants', 'needs', 'savings'];
const VALID_TYPES    = ['paycheck', 'stock_bonus', 'performance_bonus', 'misc'];

// ── CSV primitives ────────────────────────────────────────────────────────────

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

function splitLines(text) {
  return text.trim().split('\n').map((l) => l.replace(/\r$/, ''));
}

// Strip currency formatting ($1,234.56 → 1234.56)
function parseAmount(str) {
  if (!str || !str.trim()) return NaN;
  return parseFloat(str.replace(/[$,]/g, ''));
}

// ── New format parser ─────────────────────────────────────────────────────────
// Expects a header row: record_type, section, category, description, amount, date

function parseNewFormat(text) {
  const lines = splitLines(text);
  if (lines.length < 2) return { rows: [], errors: [] };

  const headers = parseCsvLine(lines[0]).map((h) => h.trim());
  const rows = [];
  const errors = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const r = {};
    headers.forEach((h, idx) => { r[h] = values[idx] ?? ''; });
    const lineNum = i + 1;

    if (r.record_type === 'income') {
      if (!VALID_TYPES.includes(r.category)) {
        errors.push(`Row ${lineNum}: invalid income type "${r.category}"`);
        continue;
      }
      const amount = parseAmount(r.amount);
      if (isNaN(amount)) { errors.push(`Row ${lineNum}: invalid amount "${r.amount}"`); continue; }
      rows.push({ kind: 'income', type: r.category, amount, description: r.description || null, date: r.date || null });
    } else if (r.record_type === 'expense') {
      if (!VALID_SECTIONS.includes(r.section)) {
        errors.push(`Row ${lineNum}: invalid section "${r.section}"`);
        continue;
      }
      if (!r.category) { errors.push(`Row ${lineNum}: category required`); continue; }
      const amount = parseAmount(r.amount);
      if (isNaN(amount)) { errors.push(`Row ${lineNum}: invalid amount "${r.amount}"`); continue; }
      rows.push({ kind: 'expense', section: r.section, category: r.category, detail: r.description || null, amount, date: r.date || null });
    } else {
      errors.push(`Row ${lineNum}: unknown record_type "${r.record_type}"`);
    }
  }

  return { rows, errors };
}

// ── Legacy format parser ──────────────────────────────────────────────────────
// Column layout (0-indexed):
//   0: Paycheck    — income amount
//   1: Expenses    — wants amount
//   2: Blank 1     — wants "Category - description"
//   3: Needs       — needs amount
//   4: Blank 2     — needs "Category - description"
//   5: 401k/Savings — savings amount
//   6: Blank 3     — savings "Category - description"
//   7+             — calculated budget columns (ignored)
//
// Each row can produce up to four records (one per section).
// Header row is auto-detected and skipped if present.

function parseCategoryDetail(str) {
  if (!str || !str.trim()) return { category: 'Misc', detail: null };
  const idx = str.indexOf(' - ');
  if (idx === -1) return { category: str.trim(), detail: null };
  return {
    category: str.slice(0, idx).trim(),
    detail:   str.slice(idx + 3).trim() || null,
  };
}

function parseLegacyFormat(text) {
  const lines = splitLines(text);
  const rows  = [];
  const errors = [];

  // Detect and skip header row: if the first non-empty cell of line 0 is not a number
  let startLine = 0;
  if (lines.length > 0) {
    const firstCols = parseCsvLine(lines[0]);
    const firstVal  = firstCols[0]?.replace(/[$,]/g, '').trim();
    if (firstVal && isNaN(parseFloat(firstVal))) startLine = 1;
  }

  for (let i = startLine; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);

    // Skip completely empty rows
    if (cols.every((c) => !c.trim())) continue;

    // Col 0: income (paycheck)
    const incAmt = parseAmount(cols[0]);
    if (!isNaN(incAmt) && incAmt !== 0) {
      rows.push({ kind: 'income', type: 'paycheck', amount: incAmt, description: null, date: null });
    }

    // Col 1 + 2: wants
    const wanAmt = parseAmount(cols[1]);
    if (!isNaN(wanAmt) && wanAmt !== 0) {
      const { category, detail } = parseCategoryDetail(cols[2]);
      rows.push({ kind: 'expense', section: 'wants', category, detail, amount: wanAmt, date: null });
    }

    // Col 3 + 4: needs
    const nedAmt = parseAmount(cols[3]);
    if (!isNaN(nedAmt) && nedAmt !== 0) {
      const { category, detail } = parseCategoryDetail(cols[4]);
      rows.push({ kind: 'expense', section: 'needs', category, detail, amount: nedAmt, date: null });
    }

    // Col 5 + 6: savings
    const savAmt = parseAmount(cols[5]);
    if (!isNaN(savAmt) && savAmt !== 0) {
      const { category, detail } = parseCategoryDetail(cols[6]);
      rows.push({ kind: 'expense', section: 'savings', category, detail, amount: savAmt, date: null });
    }

    // Cols 7+ are ignored (budget calculations)
  }

  return { rows, errors };
}

// ── Route ─────────────────────────────────────────────────────────────────────
// POST /api/import/month/:monthId?format=new|legacy
// Body: text/plain CSV. Appends rows — does not clear existing data first.

router.post('/month/:monthId', (req, res) => {
  const monthId = Number(req.params.monthId);
  const month = db.prepare('SELECT * FROM months WHERE id = ?').get(monthId);
  if (!month) return res.status(404).json({ error: 'Month not found' });

  const csvText = req.body;
  if (!csvText || typeof csvText !== 'string') {
    return res.status(400).json({ error: 'Request body must be CSV text (Content-Type: text/plain)' });
  }

  const format = req.query.format === 'legacy' ? 'legacy' : 'new';
  const { rows, errors } = format === 'legacy'
    ? parseLegacyFormat(csvText)
    : parseNewFormat(csvText);

  const insertIncome = db.prepare(
    'INSERT INTO income (month_id, type, amount, description, date) VALUES (?, ?, ?, ?, ?)'
  );
  const insertExpense = db.prepare(
    'INSERT INTO expenses (month_id, section, category, detail, amount, date) VALUES (?, ?, ?, ?, ?, ?)'
  );

  let incomeCount = 0;
  let expenseCount = 0;

  db.exec('BEGIN');
  try {
    for (const r of rows) {
      if (r.kind === 'income') {
        insertIncome.run(monthId, r.type, r.amount, r.description, r.date);
        incomeCount++;
      } else {
        insertExpense.run(monthId, r.section, r.category, r.detail, r.amount, r.date);
        expenseCount++;
      }
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  res.json({ format, imported: { income: incomeCount, expenses: expenseCount }, errors });
});

module.exports = router;
