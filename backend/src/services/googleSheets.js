const path = require('path');
const { google } = require('googleapis');
const sheetsByYear = require('../config/sheetsByYear.json');

let sheetsClient = null;

function getClient() {
  if (sheetsClient) return sheetsClient;

  const keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH;
  if (!keyPath) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY_PATH is not set — see backend/.env.example');
  }

  const auth = new google.auth.GoogleAuth({
    keyFile: path.resolve(keyPath),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  sheetsClient = google.sheets({ version: 'v4', auth });
  return sheetsClient;
}

// A new spreadsheet is created each year — this maps year -> spreadsheet ID.
// Add an entry here (backend/src/config/sheetsByYear.json) when a new year's sheet is created.
function getSpreadsheetId(year) {
  const id = sheetsByYear[String(year)];
  if (!id) {
    throw new Error(`No spreadsheet configured for ${year} — add it to backend/src/config/sheetsByYear.json`);
  }
  return id;
}

// Clears the tab and writes rows starting at A1 — mirrors the "replace current sheet" import flow.
async function writeSheetTab(spreadsheetId, tabName, rows) {
  const sheets = getClient();
  const values = rows.map((row) => row.map((cell) => (cell === null || cell === undefined ? '' : cell)));

  await sheets.spreadsheets.values.clear({ spreadsheetId, range: tabName });
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${tabName}!A1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values },
  });
}

module.exports = { getSpreadsheetId, writeSheetTab };
