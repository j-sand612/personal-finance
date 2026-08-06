const express = require('express');
const router = express.Router();
const { createBackup } = require('../services/backup');

// POST /api/backup — snapshots the DB and writes it to BACKUP_DIR (defaults to Desktop)
router.post('/', (req, res, next) => {
  try {
    const filePath = createBackup();
    res.json({ ok: true, path: filePath });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
