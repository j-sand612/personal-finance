const express = require('express');
const router = express.Router();
const db = require('../db/database');

// GET /api/months
router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM months ORDER BY year DESC, month DESC').all();
  res.json(rows);
});

// POST /api/months  { year, month }
router.post('/', (req, res) => {
  const { year, month } = req.body;
  if (!year || !month) return res.status(400).json({ error: 'year and month required' });

  try {
    const stmt = db.prepare('INSERT INTO months (year, month) VALUES (?, ?)');
    const result = stmt.run(year, month);
    const created = db.prepare('SELECT * FROM months WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(created);
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      const existing = db.prepare('SELECT * FROM months WHERE year = ? AND month = ?').get(year, month);
      return res.status(409).json({ error: 'Month already exists', existing });
    }
    throw err;
  }
});

// DELETE /api/months/:id
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM months WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

module.exports = router;
