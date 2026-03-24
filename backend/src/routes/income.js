const express = require('express');
const router = express.Router({ mergeParams: true });
const db = require('../db/database');

const VALID_TYPES = ['paycheck', 'stock_bonus', 'performance_bonus', 'misc'];

// GET /api/months/:monthId/income
router.get('/', (req, res) => {
  const rows = db
    .prepare('SELECT * FROM income WHERE month_id = ? ORDER BY date, created_at')
    .all(req.params.monthId);
  res.json(rows);
});

// POST /api/months/:monthId/income
router.post('/', (req, res) => {
  const { type, amount, description, date } = req.body;
  if (!VALID_TYPES.includes(type)) {
    return res.status(400).json({ error: `type must be one of: ${VALID_TYPES.join(', ')}` });
  }
  if (amount === undefined || amount === null) {
    return res.status(400).json({ error: 'amount required' });
  }

  const result = db
    .prepare(
      'INSERT INTO income (month_id, type, amount, description, date) VALUES (?, ?, ?, ?, ?)'
    )
    .run(req.params.monthId, type, amount, description || null, date || null);

  const created = db.prepare('SELECT * FROM income WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(created);
});

// PUT /api/income/:id
router.put('/:id', (req, res) => {
  const { type, amount, description, date } = req.body;
  db.prepare(
    'UPDATE income SET type = ?, amount = ?, description = ?, date = ? WHERE id = ?'
  ).run(type, amount, description || null, date || null, req.params.id);
  const updated = db.prepare('SELECT * FROM income WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// DELETE /api/income/:id
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM income WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

module.exports = router;
