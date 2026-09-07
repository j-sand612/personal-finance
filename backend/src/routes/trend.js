const express = require('express');
const router = express.Router();
const db = require('../db/database');

// GET /api/trend/:year/:month?n=6
// Trailing N months of per-category expense totals ending at :year/:month
// (inclusive), spanning year boundaries via linearized month-index arithmetic.
router.get('/:year/:month', (req, res) => {
  const year = parseInt(req.params.year, 10);
  const month = parseInt(req.params.month, 10);
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return res.status(400).json({ error: 'invalid year/month' });
  }
  const n = Math.max(1, Math.min(24, parseInt(req.query.n, 10) || 6));
  const endIdx = year * 12 + (month - 1);
  const startIdx = endIdx - n + 1;

  const rows = db
    .prepare(
      `SELECT m.year, m.month, e.section, e.category, SUM(e.amount) AS total
       FROM expenses e
       JOIN months m ON m.id = e.month_id
       WHERE (m.year * 12 + (m.month - 1)) BETWEEN ? AND ?
       GROUP BY m.year, m.month, e.section, e.category
       ORDER BY m.year, m.month`
    )
    .all(startIdx, endIdx);

  const months = [];
  for (let idx = startIdx; idx <= endIdx; idx++) {
    months.push({ year: Math.floor(idx / 12), month: (idx % 12) + 1 });
  }

  res.json({ months, rows });
});

module.exports = router;
