const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { CATEGORIES, INCOME_TYPES, MONTH_NAMES, BUDGET_PERCENTAGES } = require('../constants/categories');

function escapeCsv(val) {
  if (val === null || val === undefined) return '';
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function buildRow(fields) {
  return fields.map(escapeCsv).join(',');
}

function fmtDate(d) {
  if (!d) return '';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// GET /api/export/month/:monthId
// Layout: Income | [sep] | Wants | [sep] | Needs | [sep] | Savings | [sep] | Budget Summary
// All sections are zipped side by side, padded with empty cells where sections are shorter.
router.get('/month/:monthId', (req, res) => {
  const monthId = Number(req.params.monthId);
  const month = db.prepare('SELECT * FROM months WHERE id = ?').get(monthId);
  if (!month) return res.status(404).json({ error: 'Month not found' });

  const income   = db.prepare('SELECT * FROM income   WHERE month_id = ? ORDER BY date, created_at').all(monthId);
  const expenses = db.prepare('SELECT * FROM expenses WHERE month_id = ? ORDER BY section, category, created_at').all(monthId);

  const wants   = expenses.filter((e) => e.section === 'wants');
  const needs   = expenses.filter((e) => e.section === 'needs');
  const savings = expenses.filter((e) => e.section === 'savings');

  // Budget calculations
  const totalIncome  = income.reduce((s, r) => s + r.amount, 0);
  const totalWants   = wants.reduce((s, r) => s + r.amount, 0);
  const totalNeeds   = needs.reduce((s, r) => s + r.amount, 0);
  const totalSavings = savings.reduce((s, r) => s + r.amount, 0);
  const budgetBase   = totalIncome + totalSavings;
  const budgetNeeds  = budgetBase * BUDGET_PERCENTAGES.needs;
  const budgetWants  = budgetBase * BUDGET_PERCENTAGES.wants;
  const budgetSavings = budgetBase * BUDGET_PERCENTAGES.savings;
  const grandTotal   = totalWants + totalNeeds + totalSavings;
  const net          = budgetBase - grandTotal;

  // Budget summary block (shown to the right of data columns).
  // Row 0 is consumed by the header row; data rows use indices 1+.
  const budgetBlock = [
    ['Needs',        budgetNeeds,   totalNeeds,   budgetNeeds - totalNeeds],
    ['Wants',        budgetWants,   totalWants,   budgetWants - totalWants],
    ['Savings',      budgetSavings, totalSavings, budgetSavings - totalSavings],
    ['', '', '', ''],
    ['Budget Base',  budgetBase,    '',           ''],
    ['Total Income', totalIncome,   '',           ''],
    ['Grand Total',  '',            grandTotal,   ''],
    ['Net',          '',            '',           net],
  ];

  const EMPTY_INC  = ['', ''];
  const EMPTY_SEC  = ['', '', '', ''];
  const EMPTY_BUD  = ['', '', '', ''];

  const header = buildRow([
    'Income Amount', 'Income Type', '',
    'Want Date', 'Want Amount', 'Want Category', 'Want Description', '',
    'Need Date', 'Need Amount', 'Need Category', 'Need Description', '',
    'Savings Date', 'Savings Amount', 'Savings Category', 'Savings Description', '',
    'Budget Section', 'Budgeted', 'Spent', 'Leftover',
  ]);

  const maxRows = Math.max(income.length, wants.length, needs.length, savings.length, budgetBlock.length);
  const csvRows = [header];

  for (let i = 0; i < maxRows; i++) {
    const r = income[i];
    const w = wants[i];
    const n = needs[i];
    const sv = savings[i];
    const b = budgetBlock[i];

    const incCols  = r  ? [r.amount,  r.type]                              : EMPTY_INC;
    const wanCols  = w  ? [fmtDate(w.date),  w.amount,  w.category,  w.detail  ?? ''] : EMPTY_SEC;
    const nedCols  = n  ? [fmtDate(n.date),  n.amount,  n.category,  n.detail  ?? ''] : EMPTY_SEC;
    const savCols  = sv ? [fmtDate(sv.date), sv.amount, sv.category, sv.detail ?? ''] : EMPTY_SEC;
    const budCols  = b  ? b                                                : EMPTY_BUD;

    csvRows.push(buildRow([...incCols, '', ...wanCols, '', ...nedCols, '', ...savCols, '', ...budCols]));
  }

  const monthName = MONTH_NAMES[month.month - 1];
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${monthName}-${month.year}.csv"`);
  res.send(csvRows.join('\n'));
});

// GET /api/export/year/:year
// Columns: section, category, Jan–Dec, Total, Avg
// Sections are separated by empty rows; leftover rows appear after budget percentages.
router.get('/year/:year', (req, res) => {
  const year = Number(req.params.year);

  const months = db.prepare('SELECT id, month FROM months WHERE year = ? ORDER BY month').all(year);
  if (months.length === 0) return res.status(404).json({ error: 'No data for this year' });

  const incomeRows = db.prepare(
    `SELECT m.month, i.type, SUM(i.amount) AS total
     FROM income i JOIN months m ON m.id = i.month_id
     WHERE m.year = ? GROUP BY m.month, i.type`
  ).all(year);

  const expenseRows = db.prepare(
    `SELECT m.month, e.section, e.category, SUM(e.amount) AS total
     FROM expenses e JOIN months m ON m.id = e.month_id
     WHERE m.year = ? GROUP BY m.month, e.section, e.category`
  ).all(year);

  const incomeMap = {};
  for (const r of incomeRows) {
    if (!incomeMap[r.type]) incomeMap[r.type] = {};
    incomeMap[r.type][r.month] = (incomeMap[r.type][r.month] ?? 0) + r.total;
  }

  const expenseMap = {};
  for (const r of expenseRows) {
    if (!expenseMap[r.section]) expenseMap[r.section] = {};
    if (!expenseMap[r.section][r.category]) expenseMap[r.section][r.category] = {};
    expenseMap[r.section][r.category][r.month] = r.total;
  }

  const activeMonths = new Set(months.map((m) => m.month));
  const ALL_MONTHS   = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const SHORT_MONTHS = MONTH_NAMES.map((n) => n.slice(0, 3));
  const avgDenom     = months.length;

  function vals(monthMap) {
    return ALL_MONTHS.map((m) => (activeMonths.has(m) ? (monthMap?.[m] ?? 0) : null));
  }

  function sumVals(...arrays) {
    return ALL_MONTHS.map((_, i) => {
      if (arrays.every((a) => a[i] === null)) return null;
      return arrays.reduce((s, a) => s + (a[i] ?? 0), 0);
    });
  }

  function rowTotal(values) { return values.reduce((s, v) => s + (v ?? 0), 0); }
  function rowAvg(values)   { return avgDenom > 0 ? rowTotal(values) / avgDenom : 0; }

  const TOTAL_COLS = 2 + 12 + 2; // section + category + 12 months + Total + Avg
  const csvRows = [buildRow(['section', 'category', ...SHORT_MONTHS, 'Total', 'Avg'])];

  function addRow(section, category, values) {
    const total = rowTotal(values);
    const avg   = rowAvg(values);
    csvRows.push(buildRow([section, category, ...ALL_MONTHS.map((_, i) => values[i] ?? ''), total, avg.toFixed(2)]));
  }

  function addEmptyRow() {
    csvRows.push(Array(TOTAL_COLS).fill('').join(','));
  }

  // ── Income ──────────────────────────────────────────────────────────────────
  const incomeByType = INCOME_TYPES.map(({ value, label }) => {
    const v = vals(incomeMap[value]);
    addRow('income', label, v);
    return v;
  });
  const totalIncomeVals = sumVals(...incomeByType);
  addRow('income', 'TOTAL INCOME', totalIncomeVals);

  addEmptyRow();

  const v401k = vals(expenseMap['savings']?.['401k']);
  const vHSA  = vals(expenseMap['savings']?.['HSA']);
  addRow('savings', '401k Contributions', v401k);
  addRow('savings', 'HSA Contributions', vHSA);
  const budgetBaseVals = sumVals(totalIncomeVals, v401k, vHSA);
  addRow('summary', 'BUDGET BASE', budgetBaseVals);

  addEmptyRow();

  // ── Wants ────────────────────────────────────────────────────────────────────
  const wantsVals = CATEGORIES.wants.map((cat) => {
    const v = vals(expenseMap['wants']?.[cat]);
    addRow('wants', cat, v);
    return v;
  });
  const wantsTotalVals = sumVals(...wantsVals);
  addRow('wants', 'WANTS TOTAL', wantsTotalVals);

  addEmptyRow();

  // ── Needs ────────────────────────────────────────────────────────────────────
  const needsVals = CATEGORIES.needs.map((cat) => {
    const v = vals(expenseMap['needs']?.[cat]);
    addRow('needs', cat, v);
    return v;
  });
  const needsTotalVals = sumVals(...needsVals);
  addRow('needs', 'NEEDS TOTAL', needsTotalVals);

  addEmptyRow();

  // ── Savings ──────────────────────────────────────────────────────────────────
  const savingsVals = CATEGORIES.savings.map((cat) => {
    const v = vals(expenseMap['savings']?.[cat]);
    addRow('savings', cat, v);
    return v;
  });
  const savingsTotalVals = sumVals(...savingsVals);
  addRow('savings', 'SAVINGS TOTAL', savingsTotalVals);

  addEmptyRow();

  // ── Budget & Leftovers ───────────────────────────────────────────────────────
  const mkBudget = (pct) => budgetBaseVals.map((v) => (v === null ? null : v * pct));
  const needsBudgetVals   = mkBudget(BUDGET_PERCENTAGES.needs);
  const wantsBudgetVals   = mkBudget(BUDGET_PERCENTAGES.wants);
  const savingsBudgetVals = mkBudget(BUDGET_PERCENTAGES.savings);

  addRow('budget', 'Needs Budget (50%)',   needsBudgetVals);
  addRow('budget', 'Wants Budget (30%)',   wantsBudgetVals);
  addRow('budget', 'Savings Budget (20%)', savingsBudgetVals);

  addEmptyRow();

  const needsLeftover   = needsBudgetVals.map((b, i)   => b === null ? null : b - (needsTotalVals[i]   ?? 0));
  const wantsLeftover   = wantsBudgetVals.map((b, i)   => b === null ? null : b - (wantsTotalVals[i]   ?? 0));
  const savingsLeftover = savingsBudgetVals.map((b, i) => b === null ? null : b - (savingsTotalVals[i] ?? 0));
  const totalLeftover   = sumVals(needsLeftover, wantsLeftover, savingsLeftover);

  addRow('leftover', 'Needs Leftover',   needsLeftover);
  addRow('leftover', 'Wants Leftover',   wantsLeftover);
  addRow('leftover', 'Savings Leftover', savingsLeftover);
  addRow('leftover', 'Total Leftover',   totalLeftover);

  addEmptyRow();

  const grandTotalVals = sumVals(needsTotalVals, wantsTotalVals, savingsTotalVals);
  addRow('summary', 'GRAND TOTAL SPENT', grandTotalVals);

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${year}-overview.csv"`);
  res.send(csvRows.join('\n'));
});

module.exports = router;
