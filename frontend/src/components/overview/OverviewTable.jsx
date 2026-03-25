import { useMemo } from 'react';
import {
  CATEGORIES,
  INCOME_TYPES,
  MONTH_NAMES,
  BUDGET_PERCENTAGES,
  PRETAX_SAVINGS,
} from '../../constants/categories.js';
import styles from './OverviewTable.module.css';

const ALL_MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

// Case-insensitive category lookup on an expenseMap section object.
// Merges all keys that match the category name (e.g. 'Misc' + 'misc') into one month map.
function findCategory(sectionMap, cat) {
  if (!sectionMap) return undefined;
  const lower = cat.toLowerCase();
  const matchingKeys = Object.keys(sectionMap).filter((k) => k.toLowerCase() === lower);
  if (matchingKeys.length === 0) return undefined;
  const merged = {};
  for (const key of matchingKeys) {
    for (const [month, val] of Object.entries(sectionMap[key])) {
      merged[Number(month)] = (merged[Number(month)] ?? 0) + val;
    }
  }
  return merged;
}
const SHORT_MONTHS = MONTH_NAMES.map((n) => n.slice(0, 3));

const fmt = (n) =>
  n === 0
    ? null
    : n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

const fmtAlways = (n) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

// ─── Pivot API data into lookup maps ────────────────────────────────────────

function buildMaps(data) {
  // incomeMap[type][month] = total
  const incomeMap = {};
  for (const row of data.income) {
    if (!incomeMap[row.type]) incomeMap[row.type] = {};
    incomeMap[row.type][row.month] = (incomeMap[row.type][row.month] ?? 0) + row.total;
  }

  // expenseMap[section][category][month] = total
  const expenseMap = {};
  for (const row of data.expenses) {
    if (!expenseMap[row.section]) expenseMap[row.section] = {};
    if (!expenseMap[row.section][row.category]) expenseMap[row.section][row.category] = {};
    expenseMap[row.section][row.category][row.month] =
      (expenseMap[row.section][row.category][row.month] ?? 0) + row.total;
  }

  return { incomeMap, expenseMap };
}

// ─── Row builder helpers ─────────────────────────────────────────────────────

function makeValues(monthMap, activeMonths) {
  return ALL_MONTHS.map((m) => (activeMonths.has(m) ? (monthMap?.[m] ?? 0) : null));
}

function stats(values, avgDenominator) {
  const total = values.reduce((s, v) => s + (v ?? 0), 0);
  const avg = avgDenominator > 0 ? total / avgDenominator : 0;
  return { total, avg };
}

// Sum all data-map entries whose keys don't match any known category (case-insensitive).
// Returns a values array if there are unknowns, or null if nothing to show.
function getOtherValues(sectionMap, knownCats, activeMonths) {
  if (!sectionMap) return null;
  const unknownKeys = Object.keys(sectionMap).filter(
    (k) => !knownCats.some((c) => c.toLowerCase() === k.toLowerCase())
  );
  if (unknownKeys.length === 0) return null;
  const otherMonthMap = {};
  for (const key of unknownKeys) {
    for (const [month, val] of Object.entries(sectionMap[key])) {
      otherMonthMap[month] = (otherMonthMap[month] ?? 0) + val;
    }
  }
  return makeValues(otherMonthMap, activeMonths);
}

function sumValues(...valueArrays) {
  return ALL_MONTHS.map((_, i) => {
    const vals = valueArrays.map((arr) => arr[i] ?? 0);
    // If ALL source arrays have null for this month, keep null
    if (valueArrays.every((arr) => arr[i] === null)) return null;
    return vals.reduce((s, v) => s + v, 0);
  });
}

// ─── Build rows array ────────────────────────────────────────────────────────
// Row shape: { type, label, values[12], total, avg, className }

function buildRows(data) {
  const { incomeMap, expenseMap } = buildMaps(data);
  const activeMonths = new Set(data.months);
  const avgDenominator = data.months.length;

  const rows = [];
  const push = (row) => rows.push(row);
  const header = (label, className) => push({ type: 'header', label, className });
  const spacer = () => push({ type: 'spacer' });

  // ── Income ─────────────────────────────────────────────────────────────────
  header('Income', styles.headerIncome);

  const incomeRowsByType = INCOME_TYPES.map(({ value, label }) => {
    const values = makeValues(incomeMap[value], activeMonths);
    return { values, ...stats(values, avgDenominator), label };
  });

  incomeRowsByType.forEach(({ label, values, total, avg }) => {
    push({ type: 'data', label, values, total, avg });
  });

  const totalIncomeValues = sumValues(...incomeRowsByType.map((r) => r.values));
  const totalIncomeStats = stats(totalIncomeValues, avgDenominator);
  push({ type: 'summary', label: 'Total Income', values: totalIncomeValues, ...totalIncomeStats, className: styles.summaryIncome });

  spacer();

  // Pre-tax savings (e.g. 401k, HSA) are shown here and added to the budget base.
  // Post-tax savings (e.g. Extra Mortgage Payments) appear only in the Savings section below.
  const preTaxSavingsValuesList = PRETAX_SAVINGS.map((cat) => {
    const values = makeValues(findCategory(expenseMap['savings'], cat), activeMonths);
    push({ type: 'data', label: `${cat} Contributions`, values, ...stats(values, avgDenominator) });
    return values;
  });

  const budgetBaseValues = sumValues(totalIncomeValues, ...preTaxSavingsValuesList);
  const budgetBaseStats  = stats(budgetBaseValues, avgDenominator);
  push({ type: 'summary', label: 'Budget Base', values: budgetBaseValues, ...budgetBaseStats, className: styles.summaryBase });

  spacer();

  // ── Wants ──────────────────────────────────────────────────────────────────
  header('Wants', styles.headerWants);
  const wantsCategoryValues = [];

  CATEGORIES.wants.forEach((cat) => {
    const values = makeValues(findCategory(expenseMap['wants'], cat), activeMonths);
    wantsCategoryValues.push(values);
    push({ type: 'data', label: cat, values, ...stats(values, avgDenominator) });
  });

  const wantsOther = getOtherValues(expenseMap['wants'], CATEGORIES.wants, activeMonths);
  if (wantsOther) {
    wantsCategoryValues.push(wantsOther);
    push({ type: 'data', label: 'Other', values: wantsOther, ...stats(wantsOther, avgDenominator) });
  }

  const wantsTotalValues = sumValues(...wantsCategoryValues);
  push({ type: 'summary', label: 'Wants Total', values: wantsTotalValues, ...stats(wantsTotalValues, avgDenominator), className: styles.summaryWants });

  spacer();

  // ── Needs ──────────────────────────────────────────────────────────────────
  header('Needs', styles.headerNeeds);
  const needsCategoryValues = [];

  CATEGORIES.needs.forEach((cat) => {
    const values = makeValues(findCategory(expenseMap['needs'], cat), activeMonths);
    needsCategoryValues.push(values);
    push({ type: 'data', label: cat, values, ...stats(values, avgDenominator) });
  });

  const needsOther = getOtherValues(expenseMap['needs'], CATEGORIES.needs, activeMonths);
  if (needsOther) {
    needsCategoryValues.push(needsOther);
    push({ type: 'data', label: 'Other', values: needsOther, ...stats(needsOther, avgDenominator) });
  }

  const needsTotalValues = sumValues(...needsCategoryValues);
  push({ type: 'summary', label: 'Needs Total', values: needsTotalValues, ...stats(needsTotalValues, avgDenominator), className: styles.summaryNeeds });

  spacer();

  // ── Savings ────────────────────────────────────────────────────────────────
  header('Savings', styles.headerSavings);
  const savingsCategoryValues = [];

  CATEGORIES.savings.forEach((cat) => {
    const values = makeValues(findCategory(expenseMap['savings'], cat), activeMonths);
    savingsCategoryValues.push(values);
    push({ type: 'data', label: cat, values, ...stats(values, avgDenominator) });
  });

  const savingsOther = getOtherValues(expenseMap['savings'], CATEGORIES.savings, activeMonths);
  if (savingsOther) {
    savingsCategoryValues.push(savingsOther);
    push({ type: 'data', label: 'Other', values: savingsOther, ...stats(savingsOther, avgDenominator) });
  }

  const savingsTotalValues = sumValues(...savingsCategoryValues);
  push({ type: 'summary', label: 'Savings Total', values: savingsTotalValues, ...stats(savingsTotalValues, avgDenominator), className: styles.summarySavings });

  spacer();

  // ── Budget / Total / Leftover ───────────────────────────────────────────────
  header('Budget Summary', styles.headerBudget);

  // Per-month budget amounts derived from budget base
  const mkBudget = (pct) =>
    budgetBaseValues.map((v) => (v === null ? null : v * pct));

  const needsBudgetValues   = mkBudget(BUDGET_PERCENTAGES.needs);
  const wantsBudgetValues   = mkBudget(BUDGET_PERCENTAGES.wants);
  const savingsBudgetValues = mkBudget(BUDGET_PERCENTAGES.savings);

  push({ type: 'budget', label: 'Needs Budget (50%)',   values: needsBudgetValues,   ...stats(needsBudgetValues,   avgDenominator), className: styles.budgetNeeds });
  push({ type: 'budget', label: 'Wants Budget (30%)',   values: wantsBudgetValues,   ...stats(wantsBudgetValues,   avgDenominator), className: styles.budgetWants });
  push({ type: 'budget', label: 'Savings Budget (20%)', values: savingsBudgetValues, ...stats(savingsBudgetValues, avgDenominator), className: styles.budgetSavings });

  spacer();

  push({ type: 'data', label: 'Needs Spent',   values: needsTotalValues,   ...stats(needsTotalValues,   avgDenominator) });
  push({ type: 'data', label: 'Wants Spent',   values: wantsTotalValues,   ...stats(wantsTotalValues,   avgDenominator) });
  push({ type: 'data', label: 'Savings Spent', values: savingsTotalValues, ...stats(savingsTotalValues, avgDenominator) });

  const grandTotalValues = sumValues(needsTotalValues, wantsTotalValues, savingsTotalValues);
  push({ type: 'summary', label: 'Grand Total Spent', values: grandTotalValues, ...stats(grandTotalValues, avgDenominator), className: styles.summaryGrand });

  spacer();

  // Leftover = budget - spent (per section, per month)
  const needsLeftoverValues   = needsBudgetValues.map((b, i)   => b === null ? null : b - (needsTotalValues[i]   ?? 0));
  const wantsLeftoverValues   = wantsBudgetValues.map((b, i)   => b === null ? null : b - (wantsTotalValues[i]   ?? 0));
  const savingsLeftoverValues = savingsBudgetValues.map((b, i) => b === null ? null : b - (savingsTotalValues[i] ?? 0));

  push({ type: 'leftover', label: 'Needs Leftover',   values: needsLeftoverValues,   ...stats(needsLeftoverValues,   avgDenominator), className: styles.leftoverNeeds });
  push({ type: 'leftover', label: 'Wants Leftover',   values: wantsLeftoverValues,   ...stats(wantsLeftoverValues,   avgDenominator), className: styles.leftoverWants });
  push({ type: 'leftover', label: 'Savings Leftover', values: savingsLeftoverValues, ...stats(savingsLeftoverValues, avgDenominator), className: styles.leftoverSavings });

  const totalLeftoverValues = sumValues(needsLeftoverValues, wantsLeftoverValues, savingsLeftoverValues);
  push({ type: 'summary', label: 'Total Leftover', values: totalLeftoverValues, ...stats(totalLeftoverValues, avgDenominator), className: styles.summaryLeftover });

  return { rows, activeMonths, budgetBaseValues, needsBudgetValues, wantsBudgetValues };
}

// ─── Cell renderer ───────────────────────────────────────────────────────────

function Cell({ value, budget, isLeftover }) {
  if (value === null) return <td className={styles.cellEmpty}>—</td>;

  const text = fmt(value);
  if (!text) return <td className={styles.cellZero}>$0</td>;

  let cls = styles.cell;
  if (isLeftover) {
    cls = value >= 0 ? `${styles.cell} ${styles.positive}` : `${styles.cell} ${styles.negative}`;
  } else if (budget !== undefined && budget !== null) {
    // Slightly highlight if over budget
    if (value > budget) cls = `${styles.cell} ${styles.overBudget}`;
  }

  return <td className={cls}>{text}</td>;
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function OverviewTable({ data }) {
  const { rows, activeMonths, budgetBaseValues, needsBudgetValues, wantsBudgetValues } =
    useMemo(() => buildRows(data), [data]);

  // Build per-month budget lookup for highlighting overspend on expense rows
  const needsBudgetByMonth = useMemo(() => {
    const map = {};
    ALL_MONTHS.forEach((m, i) => { map[m] = needsBudgetValues[i]; });
    return map;
  }, [needsBudgetValues]);

  return (
    <div className={styles.wrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={`${styles.th} ${styles.labelCol}`}>Category</th>
            {ALL_MONTHS.map((m, i) => (
              <th
                key={m}
                className={`${styles.th} ${styles.monthCol} ${!activeMonths.has(m) ? styles.inactiveMonth : ''}`}
              >
                {SHORT_MONTHS[i]}
              </th>
            ))}
            <th className={`${styles.th} ${styles.totalCol}`}>Total</th>
            <th className={`${styles.th} ${styles.avgCol}`}>Avg</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => {
            if (row.type === 'spacer') {
              return <tr key={idx} className={styles.spacer}><td colSpan={15} /></tr>;
            }
            if (row.type === 'header') {
              return (
                <tr key={idx} className={`${styles.sectionHeader} ${row.className ?? ''}`}>
                  <td colSpan={15}>{row.label}</td>
                </tr>
              );
            }

            const isLeftover = row.type === 'leftover';

            return (
              <tr
                key={idx}
                className={`${styles.dataRow} ${row.className ?? ''} ${
                  row.type === 'summary' ? styles.summaryRow : ''
                } ${row.type === 'budget' ? styles.budgetRow : ''}`}
              >
                <td className={styles.labelCell}>{row.label}</td>
                {row.values.map((v, i) => (
                  <Cell key={i} value={v} isLeftover={isLeftover} />
                ))}
                <td className={`${styles.totalCell} ${isLeftover ? (row.total >= 0 ? styles.positive : styles.negative) : ''}`}>
                  {fmtAlways(row.total)}
                </td>
                <td className={`${styles.avgCell} text-muted`}>
                  {fmtAlways(row.avg)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
