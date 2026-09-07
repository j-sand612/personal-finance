import { CATEGORIES, MONTH_NAMES } from '../constants/categories.js';

const SHORT_MONTHS = MONTH_NAMES.map((n) => n.slice(0, 3));

// Case-insensitive match against the known category list for a section;
// anything unrecognized (typos, legacy names, free text) folds into "Other" —
// same rule OverviewTable.jsx uses (findCategory / getOtherValues) so a
// treemap cell or trend card never disagrees with the pivot table.
function canonicalizeCategory(section, rawCategory) {
  const known = CATEGORIES[section] || [];
  const lower = String(rawCategory ?? '').toLowerCase();
  const match = known.find((c) => c.toLowerCase() === lower);
  return match || 'Other';
}

// Groups a flat list of expense rows into per-category net totals.
// Accepts either MonthPage's raw rows ({section, category, amount}) or
// Overview's pre-aggregated rows ({section, category, total}) — whichever
// amount field is present is summed.
//
// Includes categories whose net comes out <= 0 (e.g. a category that's
// nothing but a refund this period) — callers must NOT drop these when
// computing totals/summaries, only when building treemap cells (a
// rectangle can't have zero or negative area). Dropping them at the
// source here would silently remove the refund's offsetting effect and
// overstate the section/grand total by the refund amount.
export function groupByCategory(rows) {
  const totals = new Map();
  for (const row of rows) {
    const amount = row.amount ?? row.total ?? 0;
    const category = canonicalizeCategory(row.section, row.category);
    const key = `${row.section}|${category}`;
    if (!totals.has(key)) {
      totals.set(key, { section: row.section, category, amount: 0 });
    }
    totals.get(key).amount += amount;
  }
  return Array.from(totals.values());
}

// Drops the trailing month if nothing at all has been entered for it yet —
// otherwise every category would show a manufactured "dropped to $0" swing
// the moment a new, still-empty month is created (which happens on every
// visit to it, since MonthPage auto-creates the row). Trends should reflect
// entered history, not the act of a month merely existing.
function trimTrailingEmptyMonth({ series, monthLabels }) {
  if (monthLabels.length <= 1) return { series, monthLabels };
  const lastTotal = series.reduce((s, d) => s + (d.values[d.values.length - 1] || 0), 0);
  if (lastTotal !== 0) return { series, monthLabels };
  return {
    series: series.map((d) => ({ ...d, values: d.values.slice(0, -1) })),
    monthLabels: monthLabels.slice(0, -1),
  };
}

// Shapes the trailing-N-month trend endpoint's { months, rows } response into
// [{category, section, values}], zero-filled across the (synthetic, always
// contiguous) months window. Labels cross year boundaries, so they include
// the year: "Sep '25".
export function seriesFromTrendResponse({ months, rows }) {
  const seriesMap = new Map();
  const monthIndex = new Map(months.map((m, i) => [`${m.year}-${m.month}`, i]));

  for (const row of rows) {
    const category = canonicalizeCategory(row.section, row.category);
    const key = `${row.section}|${category}`;
    if (!seriesMap.has(key)) {
      seriesMap.set(key, {
        section: row.section,
        category,
        values: new Array(months.length).fill(0),
      });
    }
    const idx = monthIndex.get(`${row.year}-${row.month}`);
    if (idx !== undefined) {
      seriesMap.get(key).values[idx] += row.total;
    }
  }

  const monthLabels = months.map((m) => `${SHORT_MONTHS[m.month - 1]} '${String(m.year).slice(-2)}`);
  return trimTrailingEmptyMonth({ series: Array.from(seriesMap.values()), monthLabels });
}

// Shapes the Overview page's already-fetched { months, expenses } into the
// same [{category, section, values}] shape. `months` here is sparse (only
// months the user actually created), so — unlike the trend endpoint — there
// is no gap to zero-fill: a missing month is genuinely "not entered", not $0.
export function seriesFromOverviewData(data) {
  const sortedMonths = [...data.months].sort((a, b) => a - b);
  const monthIndex = new Map(sortedMonths.map((m, i) => [m, i]));

  const seriesMap = new Map();
  for (const row of data.expenses) {
    const category = canonicalizeCategory(row.section, row.category);
    const key = `${row.section}|${category}`;
    if (!seriesMap.has(key)) {
      seriesMap.set(key, {
        section: row.section,
        category,
        values: new Array(sortedMonths.length).fill(0),
      });
    }
    const idx = monthIndex.get(row.month);
    if (idx !== undefined) {
      seriesMap.get(key).values[idx] += row.total;
    }
  }

  const monthLabels = sortedMonths.map((m) => SHORT_MONTHS[m - 1]);
  return trimTrailingEmptyMonth({ series: Array.from(seriesMap.values()), monthLabels });
}

// Ranks series by the size of the swing between the last two points —
// the window always ends "now" regardless of how much of it gets drawn,
// so this is computed once and not re-ranked when the draw range changes.
// Series with fewer than 2 points can't have a swing and are excluded.
export function rankBySwing(series) {
  return series
    .filter((s) => s.values.length >= 2)
    .map((s) => {
      const cur = s.values[s.values.length - 1];
      const prev = s.values[s.values.length - 2];
      return { ...s, delta: cur - prev };
    })
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
}
