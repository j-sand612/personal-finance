const express = require('express');
const router = express.Router();
const db = require('../db/database');

// GET /api/overview/:year
// Returns flat arrays of income and expense totals, grouped by month + category.
// The frontend pivots this into the subcategory x month grid.
router.get('/:year', (req, res) => {
  const year = parseInt(req.params.year, 10);

  // All months that exist for this year
  const months = db
    .prepare('SELECT id, month FROM months WHERE year = ? ORDER BY month')
    .all(year);

  // Income totals per month, broken down by type
  const incomeRows = db
    .prepare(
      `SELECT m.month, i.type, SUM(i.amount) AS total
       FROM income i
       JOIN months m ON m.id = i.month_id
       WHERE m.year = ?
       GROUP BY m.month, i.type`
    )
    .all(year);

  // Expense totals per month, broken down by section + category
  const expenseRows = db
    .prepare(
      `SELECT m.month, e.section, e.category, SUM(e.amount) AS total
       FROM expenses e
       JOIN months m ON m.id = e.month_id
       WHERE m.year = ?
       GROUP BY m.month, e.section, e.category`
    )
    .all(year);

  res.json({
    year,
    months: months.map((m) => m.month),
    income: incomeRows,
    expenses: expenseRows,
  });
});

module.exports = router;
