const express = require('express');
const router = express.Router();
const db = require('../db/database');

// GET /api/templates
router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM templates ORDER BY sort_order, id').all();
  res.json(rows);
});

// POST /api/templates
router.post('/', (req, res) => {
  const { section, category, detail, amount, sort_order } = req.body;
  if (!section || !category) {
    return res.status(400).json({ error: 'section and category required' });
  }

  const result = db
    .prepare(
      'INSERT INTO templates (section, category, detail, amount, sort_order) VALUES (?, ?, ?, ?, ?)'
    )
    .run(section, category, detail || null, amount ?? null, sort_order ?? 0);

  const created = db.prepare('SELECT * FROM templates WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(created);
});

// PUT /api/templates/:id
router.put('/:id', (req, res) => {
  const { section, category, detail, amount, sort_order } = req.body;
  db.prepare(
    'UPDATE templates SET section = ?, category = ?, detail = ?, amount = ?, sort_order = ? WHERE id = ?'
  ).run(section, category, detail || null, amount ?? null, sort_order ?? 0, req.params.id);
  const updated = db.prepare('SELECT * FROM templates WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// DELETE /api/templates/:id
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM templates WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

// ── Income templates ──────────────────────────────────────────────────────────

// GET /api/templates/income
router.get('/income', (req, res) => {
  const rows = db.prepare('SELECT * FROM income_templates ORDER BY sort_order, id').all();
  res.json(rows);
});

// POST /api/templates/income
router.post('/income', (req, res) => {
  const { type, description, amount, sort_order } = req.body;
  if (!type) return res.status(400).json({ error: 'type required' });

  const result = db
    .prepare(
      'INSERT INTO income_templates (type, description, amount, sort_order) VALUES (?, ?, ?, ?)'
    )
    .run(type, description || null, amount ?? null, sort_order ?? 0);

  const created = db.prepare('SELECT * FROM income_templates WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(created);
});

// PUT /api/templates/income/:id
router.put('/income/:id', (req, res) => {
  const { type, description, amount, sort_order } = req.body;
  db.prepare(
    'UPDATE income_templates SET type = ?, description = ?, amount = ?, sort_order = ? WHERE id = ?'
  ).run(type, description || null, amount ?? null, sort_order ?? 0, req.params.id);
  const updated = db.prepare('SELECT * FROM income_templates WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// DELETE /api/templates/income/:id
router.delete('/income/:id', (req, res) => {
  db.prepare('DELETE FROM income_templates WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

module.exports = router;
