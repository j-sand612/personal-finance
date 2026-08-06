const express = require('express');
const router = express.Router();
const { buildMonthRows, buildYearRows } = require('../services/exportData');

function escapeCsv(val) {
  if (val === null || val === undefined) return '';
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function rowsToCsv(rows) {
  return rows.map((row) => row.map(escapeCsv).join(',')).join('\n');
}

// GET /api/export/month/:monthId
router.get('/month/:monthId', (req, res) => {
  const result = buildMonthRows(Number(req.params.monthId));
  if (!result) return res.status(404).json({ error: 'Month not found' });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${result.monthName}-${result.year}.csv"`);
  res.send(rowsToCsv(result.rows));
});

// GET /api/export/year/:year
router.get('/year/:year', (req, res) => {
  const result = buildYearRows(Number(req.params.year));
  if (!result) return res.status(404).json({ error: 'No data for this year' });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${req.params.year}-overview.csv"`);
  res.send(rowsToCsv(result.rows));
});

module.exports = router;
