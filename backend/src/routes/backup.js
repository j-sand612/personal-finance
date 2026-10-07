const express = require('express');
const fs = require('fs');
const router = express.Router();
const { createBackup, backupFilename } = require('../services/backup');

// GET /api/backup — snapshots the DB and streams it to the browser as a download,
// so the backup lands on whichever device clicked the button (not the server's disk)
router.get('/', (req, res, next) => {
  let tmpPath;
  try {
    tmpPath = createBackup();
  } catch (err) {
    return next(err);
  }
  res.download(tmpPath, backupFilename(), (err) => {
    fs.unlink(tmpPath, () => {});
    if (err && !res.headersSent) next(err);
  });
});

module.exports = router;
