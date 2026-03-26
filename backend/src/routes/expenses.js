const express = require('express');
const router = express.Router({ mergeParams: true });
const db = require('../db/database');

const VALID_SECTIONS = ['wants', 'needs', 'savings'];

// GET /api/months/:monthId/expenses
router.get('/', (req, res) => {
  const rows = db
    .prepare(
      'SELECT * FROM expenses WHERE month_id = ? ORDER BY section, category, created_at'
    )
    .all(req.params.monthId);
  res.json(rows);
});

// POST /api/months/:monthId/expenses
router.post('/', (req, res) => {
  const { section, category, detail, amount, date } = req.body;
  if (!VALID_SECTIONS.includes(section)) {
    return res.status(400).json({ error: `section must be one of: ${VALID_SECTIONS.join(', ')}` });
  }
  if (!category) return res.status(400).json({ error: 'category required' });
  if (amount === undefined || amount === null) {
    return res.status(400).json({ error: 'amount required' });
  }

  const result = db
    .prepare(
      'INSERT INTO expenses (month_id, section, category, detail, amount, date) VALUES (?, ?, ?, ?, ?, ?)'
    )
    .run(req.params.monthId, section, category, detail || null, amount, date || null);

  const created = db.prepare('SELECT * FROM expenses WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(created);
});

// POST /api/months/:monthId/expenses/apply-templates
// Bulk-inserts all expense and income templates for this month
router.post('/apply-templates', (req, res) => {
  const expenseTemplates = db.prepare('SELECT * FROM templates ORDER BY sort_order').all();
  const incomeTemplates  = db.prepare('SELECT * FROM income_templates ORDER BY sort_order').all();

  const insertExpense = db.prepare(
    'INSERT INTO expenses (month_id, section, category, detail, amount, date) VALUES (?, ?, ?, ?, ?, ?)'
  );
  const insertIncome = db.prepare(
    'INSERT INTO income (month_id, type, amount, description, date) VALUES (?, ?, ?, ?, ?)'
  );

  db.exec('BEGIN');
  try {
    for (const t of expenseTemplates) {
      insertExpense.run(req.params.monthId, t.section, t.category, t.detail, t.amount ?? 0, null);
    }
    for (const t of incomeTemplates) {
      insertIncome.run(req.params.monthId, t.type, t.amount ?? 0, t.description, null);
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  const expenses = db
    .prepare('SELECT * FROM expenses WHERE month_id = ? ORDER BY section, category, created_at')
    .all(req.params.monthId);
  const income = db
    .prepare('SELECT * FROM income WHERE month_id = ? ORDER BY created_at')
    .all(req.params.monthId);

  res.status(201).json({ expenses, income });
});

// PUT /api/expenses/:id
router.put('/:id', (req, res) => {
  const { section, category, detail, amount, date } = req.body;
  db.prepare(
    'UPDATE expenses SET section = ?, category = ?, detail = ?, amount = ?, date = ? WHERE id = ?'
  ).run(section, category, detail || null, amount, date || null, req.params.id);
  const updated = db.prepare('SELECT * FROM expenses WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// DELETE /api/expenses/:id
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM expenses WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

module.exports = router;
