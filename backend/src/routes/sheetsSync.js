const express = require('express');
const router = express.Router();
const { buildMonthRows, buildYearRows } = require('../services/exportData');
const { getSpreadsheetId, writeSheetTab } = require('../services/googleSheets');

// POST /api/sheets-sync/month/:monthId — writes into the tab named after the month's 3-letter abbreviation (e.g. "Jan")
// in that month's year's spreadsheet.
router.post('/month/:monthId', async (req, res, next) => {
  try {
    const result = buildMonthRows(Number(req.params.monthId));
    if (!result) return res.status(404).json({ error: 'Month not found' });

    const tab = result.monthName.slice(0, 3);
    const spreadsheetId = getSpreadsheetId(result.year);
    await writeSheetTab(spreadsheetId, tab, result.rows);
    res.json({ ok: true, tab, year: result.year });
  } catch (err) {
    next(err);
  }
});

// POST /api/sheets-sync/year/:year — writes into the tab named after the year (e.g. "2026") in that year's spreadsheet.
router.post('/year/:year', async (req, res, next) => {
  try {
    const year = Number(req.params.year);
    const result = buildYearRows(year);
    if (!result) return res.status(404).json({ error: 'No data for this year' });

    const tab = String(year);
    const spreadsheetId = getSpreadsheetId(year);
    await writeSheetTab(spreadsheetId, tab, result.rows);
    res.json({ ok: true, tab, year });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
