const express = require('express');
const ExcelJS = require('exceljs');
const router = express.Router();
const db = require('../db/database');
const { CATEGORIES, INCOME_TYPES, MONTH_NAMES, BUDGET_PERCENTAGES } = require('../constants/categories');

// ── Shared style constants ────────────────────────────────────────────────────

const COLORS = {
  income:  { bg: 'FF312E81', fg: 'FFA5B4FC' }, // indigo
  wants:   { bg: 'FF7C2D12', fg: 'FFFDA172' }, // orange
  needs:   { bg: 'FF1E3A5F', fg: 'FF93C5FD' }, // blue
  savings: { bg: 'FF14532D', fg: 'FF86EFAC' }, // green
  budget:  { bg: 'FF1E2030', fg: 'FF8892A4' }, // gray
  summary: { bg: 'FF232635', fg: 'FFE2E8F0' }, // dark
  total:   { bg: 'FF1A1D27', fg: 'FFE2E8F0' },
  header:  { bg: 'FF0F1117', fg: 'FF8892A4' },
};

const CURRENCY_FMT = '$#,##0.00';
const CURRENCY_FMT_0 = '$#,##0';

function applyFill(cell, argbColor) {
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argbColor } };
}

function applyFont(cell, opts = {}) {
  cell.font = { name: 'Calibri', size: opts.size ?? 11, bold: opts.bold ?? false, color: { argb: opts.color ?? 'FFE2E8F0' }, italic: opts.italic ?? false };
}

function applyBorder(cell, edges = ['bottom']) {
  const side = { style: 'thin', color: { argb: 'FF2E3150' } };
  cell.border = Object.fromEntries(edges.map((e) => [e, side]));
}

// Apply style to every cell in a row across cols A–D (month) or A–O (year)
function styleRow(row, colCount, bgArgb, fgArgb, { bold = false, italic = false, size = 11 } = {}) {
  for (let c = 1; c <= colCount; c++) {
    const cell = row.getCell(c);
    applyFill(cell, bgArgb);
    applyFont(cell, { bold, italic, color: fgArgb, size });
    applyBorder(cell, ['bottom']);
  }
}

// ── MONTH EXPORT ─────────────────────────────────────────────────────────────

// GET /api/export/month/:monthId
router.get('/month/:monthId', async (req, res) => {
  const monthId = Number(req.params.monthId);
  const month = db.prepare('SELECT * FROM months WHERE id = ?').get(monthId);
  if (!month) return res.status(404).json({ error: 'Month not found' });

  const income   = db.prepare('SELECT * FROM income   WHERE month_id = ? ORDER BY date, created_at').all(monthId);
  const expenses = db.prepare('SELECT * FROM expenses WHERE month_id = ? ORDER BY category, created_at').all(monthId);

  const wants   = expenses.filter((e) => e.section === 'wants');
  const needs   = expenses.filter((e) => e.section === 'needs');
  const savings = expenses.filter((e) => e.section === 'savings');

  const monthName = MONTH_NAMES[month.month - 1];
  const title = `${monthName} ${month.year}`;

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Personal Finance';
  const ws = wb.addWorksheet(title, { views: [{ state: 'frozen', ySplit: 1 }] });

  // Column widths
  ws.columns = [
    { width: 24 }, // A: category / type
    { width: 30 }, // B: detail / description
    { width: 14 }, // C: amount
    { width: 12 }, // D: date
  ];

  const COL_COUNT = 4;

  // ── Title ──
  const titleRow = ws.addRow([title]);
  ws.mergeCells(`A${titleRow.number}:D${titleRow.number}`);
  applyFill(titleRow.getCell(1), 'FF0F1117');
  applyFont(titleRow.getCell(1), { bold: true, size: 14, color: 'FFE2E8F0' });
  titleRow.height = 28;
  ws.addRow([]);

  // Helper: section header
  function addSectionHeader(label, color) {
    const row = ws.addRow([label]);
    ws.mergeCells(`A${row.number}:D${row.number}`);
    styleRow(row, COL_COUNT, color.bg, color.fg, { bold: true, size: 11 });
    row.height = 20;
  }

  // Helper: column sub-headers
  function addColHeaders(labels) {
    const row = ws.addRow(labels);
    styleRow(row, COL_COUNT, COLORS.header.bg, COLORS.header.fg, { bold: true, size: 10 });
    row.height = 18;
  }

  // Helper: data row
  function addDataRow(cols, bgArgb = 'FF1A1D27') {
    const row = ws.addRow(cols);
    for (let c = 1; c <= COL_COUNT; c++) {
      applyFill(row.getCell(c), bgArgb);
      applyFont(row.getCell(c), { color: 'FFE2E8F0' });
      applyBorder(row.getCell(c), ['bottom']);
    }
    // Amount cell: right-align + currency
    row.getCell(3).alignment = { horizontal: 'right' };
    row.getCell(3).numFmt = CURRENCY_FMT;
    row.height = 17;
    return row;
  }

  // Helper: total row
  function addTotalRow(label, total, bgArgb = COLORS.summary.bg) {
    const row = ws.addRow([label, '', total]);
    ws.mergeCells(`A${row.number}:B${row.number}`);
    styleRow(row, COL_COUNT, bgArgb, COLORS.summary.fg, { bold: true });
    row.getCell(3).numFmt = CURRENCY_FMT;
    row.getCell(3).alignment = { horizontal: 'right' };
    row.height = 18;
  }

  function fmtDate(d) {
    if (!d) return '';
    return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  function typeLabel(t) {
    return INCOME_TYPES.find((x) => x.value === t)?.label ?? t;
  }

  // ── INCOME SECTION ──────────────────────────────────────────────────────────
  addSectionHeader('INCOME', COLORS.income);
  addColHeaders(['Type', 'Description', 'Amount', 'Date']);

  const totalIncome = income.reduce((s, r) => s + r.amount, 0);
  if (income.length === 0) {
    addDataRow(['No income entries', '', '', '']);
  } else {
    income.forEach((r) => addDataRow([typeLabel(r.type), r.description ?? '', r.amount, fmtDate(r.date)]));
  }
  addTotalRow('Total Income', totalIncome, COLORS.income.bg);
  ws.addRow([]);

  // ── WANTS SECTION ───────────────────────────────────────────────────────────
  addSectionHeader('WANTS', COLORS.wants);
  addColHeaders(['Category', 'Detail', 'Amount', 'Date']);

  const totalWants = wants.reduce((s, r) => s + r.amount, 0);
  if (wants.length === 0) {
    addDataRow(['No wants expenses', '', '', '']);
  } else {
    wants.forEach((r) => addDataRow([r.category, r.detail ?? '', r.amount, fmtDate(r.date)]));
  }
  addTotalRow('Wants Total', totalWants, COLORS.wants.bg);
  ws.addRow([]);

  // ── NEEDS SECTION ───────────────────────────────────────────────────────────
  addSectionHeader('NEEDS', COLORS.needs);
  addColHeaders(['Category', 'Detail', 'Amount', 'Date']);

  const totalNeeds = needs.reduce((s, r) => s + r.amount, 0);
  if (needs.length === 0) {
    addDataRow(['No needs expenses', '', '', '']);
  } else {
    needs.forEach((r) => addDataRow([r.category, r.detail ?? '', r.amount, fmtDate(r.date)]));
  }
  addTotalRow('Needs Total', totalNeeds, COLORS.needs.bg);
  ws.addRow([]);

  // ── SAVINGS SECTION ─────────────────────────────────────────────────────────
  addSectionHeader('SAVINGS', COLORS.savings);
  addColHeaders(['Category', 'Detail', 'Amount', 'Date']);

  const totalSavings = savings.reduce((s, r) => s + r.amount, 0);
  if (savings.length === 0) {
    addDataRow(['No savings entries', '', '', '']);
  } else {
    savings.forEach((r) => addDataRow([r.category, r.detail ?? '', r.amount, fmtDate(r.date)]));
  }
  addTotalRow('Savings Total', totalSavings, COLORS.savings.bg);
  ws.addRow([]);

  // ── BUDGET SUMMARY ──────────────────────────────────────────────────────────
  const budgetBase   = totalIncome + totalSavings;
  const budgetNeeds  = budgetBase * BUDGET_PERCENTAGES.needs;
  const budgetWants  = budgetBase * BUDGET_PERCENTAGES.wants;
  const budgetSavings = budgetBase * BUDGET_PERCENTAGES.savings;

  addSectionHeader('BUDGET SUMMARY', COLORS.budget);

  // Sub-headers for budget table
  const budgetHeaderRow = ws.addRow(['', 'Budget', 'Spent', 'Remaining']);
  styleRow(budgetHeaderRow, COL_COUNT, COLORS.header.bg, COLORS.header.fg, { bold: true, size: 10 });
  for (let c = 2; c <= 4; c++) budgetHeaderRow.getCell(c).alignment = { horizontal: 'right' };
  budgetHeaderRow.height = 18;

  function addBudgetRow(label, budgeted, spent) {
    const remaining = budgeted - spent;
    const row = ws.addRow([label, budgeted, spent, remaining]);
    styleRow(row, COL_COUNT, COLORS.summary.bg, COLORS.summary.fg);
    for (let c = 2; c <= 4; c++) {
      row.getCell(c).numFmt = CURRENCY_FMT_0;
      row.getCell(c).alignment = { horizontal: 'right' };
    }
    // Color remaining cell
    const remCell = row.getCell(4);
    remCell.font = { ...remCell.font, color: { argb: remaining >= 0 ? 'FF22C55E' : 'FFEF4444' } };
    row.height = 17;
  }

  addBudgetRow('Needs (50%)',   budgetNeeds,   totalNeeds);
  addBudgetRow('Wants (30%)',   budgetWants,   totalWants);
  addBudgetRow('Savings (20%)', budgetSavings, totalSavings);
  ws.addRow([]);

  // Totals block
  const grandTotal = totalWants + totalNeeds + totalSavings;
  const net = budgetBase - grandTotal;

  function addSummaryLine(label, value, color) {
    const row = ws.addRow([label, '', value]);
    ws.mergeCells(`A${row.number}:B${row.number}`);
    styleRow(row, COL_COUNT, COLORS.total.bg, COLORS.total.fg, { bold: true });
    row.getCell(3).numFmt = CURRENCY_FMT_0;
    row.getCell(3).alignment = { horizontal: 'right' };
    if (color) row.getCell(3).font = { ...row.getCell(3).font, color: { argb: color } };
    row.height = 18;
  }

  addSummaryLine('Budget Base',  budgetBase,  null);
  addSummaryLine('Total Spent',  grandTotal,  null);
  addSummaryLine('Net',          net,         net >= 0 ? 'FF22C55E' : 'FFEF4444');

  // ── Stream response ─────────────────────────────────────────────────────────
  const filename = `${monthName}-${month.year}.xlsx`;
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  await wb.xlsx.write(res);
  res.end();
});

// ── YEAR EXPORT ───────────────────────────────────────────────────────────────

// GET /api/export/year/:year
router.get('/year/:year', async (req, res) => {
  const year = Number(req.params.year);

  const months = db.prepare('SELECT id, month FROM months WHERE year = ? ORDER BY month').all(year);
  if (months.length === 0) return res.status(404).json({ error: 'No data for this year' });

  const incomeRows  = db.prepare(
    `SELECT m.month, i.type, SUM(i.amount) AS total
     FROM income i JOIN months m ON m.id = i.month_id
     WHERE m.year = ? GROUP BY m.month, i.type`
  ).all(year);

  const expenseRows = db.prepare(
    `SELECT m.month, e.section, e.category, SUM(e.amount) AS total
     FROM expenses e JOIN months m ON m.id = e.month_id
     WHERE m.year = ? GROUP BY m.month, e.section, e.category`
  ).all(year);

  // Build lookup maps
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
  const ALL_MONTHS   = [1,2,3,4,5,6,7,8,9,10,11,12];
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

  // ── Build workbook ──────────────────────────────────────────────────────────
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Personal Finance';

  const SHORT_MONTHS = MONTH_NAMES.map((n) => n.slice(0, 3));
  const ws = wb.addWorksheet(`${year} Overview`, {
    views: [{ state: 'frozen', xSplit: 1, ySplit: 3 }],
  });

  // Column widths: A=label, B-M=months, N=Total, O=Avg
  ws.columns = [
    { width: 22 },                             // A: label
    ...ALL_MONTHS.map(() => ({ width: 10 })), // B–M: months
    { width: 12 },                             // N: Total
    { width: 10 },                             // O: Avg
  ];

  const COL_COUNT = 15; // A + 12 months + Total + Avg

  // ── Title row ──
  const titleRow = ws.addRow([`${year} Overview`]);
  ws.mergeCells(`A1:O1`);
  applyFill(titleRow.getCell(1), 'FF0F1117');
  applyFont(titleRow.getCell(1), { bold: true, size: 14, color: 'FFE2E8F0' });
  titleRow.height = 28;

  ws.addRow([]); // spacer

  // ── Month header row ──
  const headerRow = ws.addRow(['Category', ...SHORT_MONTHS, 'Total', 'Avg']);
  styleRow(headerRow, COL_COUNT, COLORS.header.bg, COLORS.header.fg, { bold: true, size: 10 });
  for (let c = 2; c <= COL_COUNT; c++) headerRow.getCell(c).alignment = { horizontal: 'right' };
  // Dim inactive month headers
  ALL_MONTHS.forEach((m, i) => {
    if (!activeMonths.has(m)) {
      headerRow.getCell(i + 2).font = { ...headerRow.getCell(i + 2).font, color: { argb: 'FF3A3F60' } };
    }
  });
  headerRow.height = 18;

  // ── Row writers ────────────────────────────────────────────────────────────

  function addYearSectionHeader(label, color) {
    const row = ws.addRow([label]);
    ws.mergeCells(`A${row.number}:O${row.number}`);
    styleRow(row, COL_COUNT, color.bg, color.fg, { bold: true });
    row.height = 19;
  }

  function addYearDataRow(label, values, { bold = false, bgArgb = 'FF1A1D27', fgArgb = 'FFE2E8F0', italic = false } = {}) {
    const total = rowTotal(values);
    const avg   = rowAvg(values);
    const row   = ws.addRow([label, ...ALL_MONTHS.map((_, i) => values[i] ?? null), total, avg]);

    for (let c = 1; c <= COL_COUNT; c++) {
      applyFill(row.getCell(c), bgArgb);
      applyFont(row.getCell(c), { bold, italic, color: fgArgb });
      applyBorder(row.getCell(c), ['bottom']);
    }
    // Number format for month/total/avg cells
    for (let c = 2; c <= COL_COUNT; c++) {
      const cell = row.getCell(c);
      if (cell.value !== null && cell.value !== undefined) cell.numFmt = CURRENCY_FMT_0;
      cell.alignment = { horizontal: 'right' };
      // Dim null (inactive month) cells
      if (cell.value === null) cell.font = { ...cell.font, color: { argb: 'FF2E3150' } };
    }
    // Total col border
    row.getCell(14).border = { ...row.getCell(14).border, left: { style: 'medium', color: { argb: 'FF2E3150' } } };
    row.height = 16;
    return { values, total, avg };
  }

  function addYearSummaryRow(label, values, color) {
    return addYearDataRow(label, values, { bold: true, bgArgb: COLORS.summary.bg, fgArgb: color ?? COLORS.summary.fg });
  }

  function addYearBudgetRow(label, values, fgArgb) {
    return addYearDataRow(label, values, { italic: true, bgArgb: COLORS.budget.bg, fgArgb });
  }

  function addYearLeftoverRow(label, values) {
    const total = rowTotal(values);
    const avg   = rowAvg(values);
    const row   = ws.addRow([label, ...ALL_MONTHS.map((_, i) => values[i] ?? null), total, avg]);
    for (let c = 1; c <= COL_COUNT; c++) {
      applyFill(row.getCell(c), COLORS.summary.bg);
      applyFont(row.getCell(c), { bold: true, color: COLORS.summary.fg });
      applyBorder(row.getCell(c), ['bottom']);
    }
    for (let c = 2; c <= COL_COUNT; c++) {
      const cell = row.getCell(c);
      const v    = cell.value;
      if (v !== null && v !== undefined) {
        cell.numFmt = CURRENCY_FMT_0;
        cell.font = { ...cell.font, color: { argb: v >= 0 ? 'FF22C55E' : 'FFEF4444' } };
      } else {
        cell.font = { ...cell.font, color: { argb: 'FF2E3150' } };
      }
      cell.alignment = { horizontal: 'right' };
    }
    row.getCell(14).border = { ...row.getCell(14).border, left: { style: 'medium', color: { argb: 'FF2E3150' } } };
    row.height = 16;
  }

  function spacer() {
    const row = ws.addRow([]);
    for (let c = 1; c <= COL_COUNT; c++) applyFill(row.getCell(c), 'FF0F1117');
    row.height = 6;
  }

  // ── INCOME ──────────────────────────────────────────────────────────────────
  addYearSectionHeader('INCOME', COLORS.income);

  const incomeByType = INCOME_TYPES.map(({ value, label }) => {
    const v = vals(incomeMap[value]);
    addYearDataRow(label, v);
    return v;
  });

  const totalIncomeVals = sumVals(...incomeByType);
  addYearSummaryRow('Total Income', totalIncomeVals, COLORS.income.fg);
  spacer();

  const v401k = vals(expenseMap['savings']?.['401k']);
  const vHSA  = vals(expenseMap['savings']?.['HSA']);
  addYearDataRow('401k Contributions', v401k);
  addYearDataRow('HSA Contributions',  vHSA);

  const budgetBaseVals = sumVals(totalIncomeVals, v401k, vHSA);
  addYearSummaryRow('Budget Base', budgetBaseVals, COLORS.income.fg);
  spacer();

  // ── WANTS ────────────────────────────────────────────────────────────────────
  addYearSectionHeader('WANTS', COLORS.wants);
  const wantsVals = CATEGORIES.wants.map((cat) => {
    const v = vals(expenseMap['wants']?.[cat]);
    addYearDataRow(cat, v);
    return v;
  });
  const wantsTotalVals = sumVals(...wantsVals);
  addYearSummaryRow('Wants Total', wantsTotalVals, COLORS.wants.fg);
  spacer();

  // ── NEEDS ────────────────────────────────────────────────────────────────────
  addYearSectionHeader('NEEDS', COLORS.needs);
  const needsVals = CATEGORIES.needs.map((cat) => {
    const v = vals(expenseMap['needs']?.[cat]);
    addYearDataRow(cat, v);
    return v;
  });
  const needsTotalVals = sumVals(...needsVals);
  addYearSummaryRow('Needs Total', needsTotalVals, COLORS.needs.fg);
  spacer();

  // ── SAVINGS ──────────────────────────────────────────────────────────────────
  addYearSectionHeader('SAVINGS', COLORS.savings);
  const savingsVals = CATEGORIES.savings.map((cat) => {
    const v = vals(expenseMap['savings']?.[cat]);
    addYearDataRow(cat, v);
    return v;
  });
  const savingsTotalVals = sumVals(...savingsVals);
  addYearSummaryRow('Savings Total', savingsTotalVals, COLORS.savings.fg);
  spacer();

  // ── BUDGET SUMMARY ────────────────────────────────────────────────────────────
  addYearSectionHeader('BUDGET SUMMARY', COLORS.budget);

  const mkBudget = (pct) => budgetBaseVals.map((v) => (v === null ? null : v * pct));
  const needsBudgetVals   = mkBudget(BUDGET_PERCENTAGES.needs);
  const wantsBudgetVals   = mkBudget(BUDGET_PERCENTAGES.wants);
  const savingsBudgetVals = mkBudget(BUDGET_PERCENTAGES.savings);

  addYearBudgetRow('Needs Budget (50%)',   needsBudgetVals,   COLORS.needs.fg);
  addYearBudgetRow('Wants Budget (30%)',   wantsBudgetVals,   COLORS.wants.fg);
  addYearBudgetRow('Savings Budget (20%)', savingsBudgetVals, COLORS.savings.fg);
  spacer();

  addYearDataRow('Needs Spent',   needsTotalVals);
  addYearDataRow('Wants Spent',   wantsTotalVals);
  addYearDataRow('Savings Spent', savingsTotalVals);
  const grandTotalVals = sumVals(needsTotalVals, wantsTotalVals, savingsTotalVals);
  addYearSummaryRow('Grand Total Spent', grandTotalVals);
  spacer();

  const needsLeftover   = needsBudgetVals.map((b, i)   => b === null ? null : b - (needsTotalVals[i]   ?? 0));
  const wantsLeftover   = wantsBudgetVals.map((b, i)   => b === null ? null : b - (wantsTotalVals[i]   ?? 0));
  const savingsLeftover = savingsBudgetVals.map((b, i) => b === null ? null : b - (savingsTotalVals[i] ?? 0));

  addYearLeftoverRow('Needs Leftover',   needsLeftover);
  addYearLeftoverRow('Wants Leftover',   wantsLeftover);
  addYearLeftoverRow('Savings Leftover', savingsLeftover);
  addYearLeftoverRow('Total Leftover',   sumVals(needsLeftover, wantsLeftover, savingsLeftover));

  // ── Stream response ───────────────────────────────────────────────────────────
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${year}-overview.xlsx"`);
  await wb.xlsx.write(res);
  res.end();
});

module.exports = router;
