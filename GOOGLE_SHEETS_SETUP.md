# Google Sheets Sync — Setup & Maintenance

This app can push data straight into a Google Sheet via the "Sync to Sheets" buttons
on the Year Overview and Month pages, instead of exporting/importing CSVs by hand.

## How it works

- A new spreadsheet is created each year. Each spreadsheet has 13 tabs: one named
  after the year (e.g. `2026`) holding the year overview, and 12 named after month
  abbreviations (`Jan`, `Feb`, … `Dec`) holding that month's data.
- `backend/src/config/sheetsByYear.json` maps `year -> spreadsheet ID`. This is how
  the app knows which spreadsheet to write to for a given year.
- The backend authenticates as a Google Cloud **service account** — a robot Google
  account dedicated to this app, not your personal login. You share each yearly
  spreadsheet with that service account's email, the same way you'd share it with
  a person.
- Clicking "Sync to Sheets" clears the target tab and rewrites it, mirroring the old
  "replace current sheet" import behavior.

---

## One-time setup (per person running this app)

Each person who runs this app needs their **own** Google Cloud service account and
key file — these aren't shared between users, since the key file grants write access
to whatever spreadsheets it's shared with.

1. **Create a Google Cloud project.**
   Go to [console.cloud.google.com](https://console.cloud.google.com) and create a
   new project (or reuse one you already have).

2. **Enable the Google Sheets API.**
   In that project, go to *APIs & Services → Library*, search "Google Sheets API",
   click **Enable**.

3. **Create a service account.**
   *IAM & Admin → Service Accounts → Create Service Account.* Any name works
   (e.g. `finance-sheet-sync`). No IAM roles are needed — skip that step.

4. **Create a JSON key for it.**
   Open the new service account → *Keys → Add Key → Create new key → JSON*. This
   downloads a `.json` file — treat it like a password, it grants full write access
   to anything shared with it.

5. **Install the key in the project.**
   Create a `backend/credentials/` folder (already gitignored, so keys never get
   committed) and move the downloaded file there as
   `backend/credentials/google-service-account.json`.

6. **Set up your `.env` file.**
   Copy `backend/.env.example` to `backend/.env` and confirm
   `GOOGLE_SERVICE_ACCOUNT_KEY_PATH` points at the key file from step 5.

7. **Restart the backend** so it picks up the new `.env`.

At this point the backend can authenticate — but it can't write anywhere until you
share a spreadsheet with it (next section).

---

## Adding a new year's spreadsheet

Do this once per calendar year, whenever you create that year's Google Sheet.

1. **Create the spreadsheet as a native Google Sheet** — File → New, or File → Save
   as Google Sheets if you started from an imported Excel file. The Sheets API can't
   write to spreadsheets that are still in Excel/Office format.

2. **Set up its tabs**: one named after the year (e.g. `2027`) for the overview, and
   `Jan` through `Dec` for months.

3. **Share it with your service account.** Open the key's `.json` file and find the
   `client_email` field — it looks like
   `finance-sheet-sync@your-project.iam.gserviceaccount.com`. In the spreadsheet,
   click **Share**, paste that email in, and give it **Editor** access. Sharing is
   per-file, so this step is required again for every new year's sheet — the
   previous year's share does not carry over.

4. **Grab the spreadsheet ID** from its URL:
   `https://docs.google.com/spreadsheets/d/THIS_PART_IS_THE_ID/edit`

5. **Add it to `backend/src/config/sheetsByYear.json`:**

   ```json
   {
     "2026": "1BfS5Krb1QbG0aUl-Q7NiqTLV-awsPH-pn8kjtFshDAc",
     "2027": "<new spreadsheet ID>"
   }
   ```

6. **Restart the backend** so it picks up the config change.

That's it — the Sync button on any page in that year will now resolve to the right
spreadsheet automatically.

---

## Troubleshooting

| Error | Cause | Fix |
|---|---|---|
| `GOOGLE_SERVICE_ACCOUNT_KEY_PATH is not set` | `.env` missing or key path wrong | Check `backend/.env` against `.env.example` |
| `No spreadsheet configured for <year>` | Year missing from `sheetsByYear.json` | Add it — see above |
| `This operation is not supported for this document. The document must not be an Office file.` | Spreadsheet is an uploaded Excel file, not a native Google Sheet | Open it → File → Save as Google Sheets, then use the new file's ID |
| `403` / permission denied from the Sheets API | Spreadsheet not shared with the service account, or shared with the wrong one | Re-check the `client_email` in the key file matches who you shared with |
| `EADDRINUSE :3001` on startup | Another `npm run dev` is already running (another terminal/IDE tab) | Close the other instance, or find and stop the process holding port 3001 |
