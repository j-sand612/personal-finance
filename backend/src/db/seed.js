/**
 * Seeds the templates table with common recurring expenses.
 * Run once: node --experimental-sqlite src/db/seed.js
 */
const db = require('./database');

const existing = db.prepare('SELECT COUNT(*) as count FROM templates').get();
if (existing.count > 0) {
  console.log('Templates already seeded. Skipping.');
  process.exit(0);
}

const insert = db.prepare(
  'INSERT INTO templates (section, category, detail, amount, sort_order) VALUES (?, ?, ?, ?, ?)'
);

db.exec('BEGIN');
try {
  // Needs — fixed
  insert.run('needs', 'Mortgage',              'Monthly payment', null, 10);
  insert.run('needs', 'HOA',                   'Monthly dues',    null, 20);
  insert.run('needs', 'Car - Payment',          null,             null, 30);
  insert.run('needs', 'Car - Insurance',        null,             null, 40);
  insert.run('needs', 'Internet',               null,             null, 50);
  insert.run('needs', 'Phone',                  null,             null, 60);
  insert.run('needs', 'Bill - Life Insurance',  null,             null, 70);
  // Needs — variable (fill in each month)
  insert.run('needs', 'Bill - Utilities',       null,             null, 80);
  insert.run('needs', 'Bill - Electric',        null,             null, 90);
  insert.run('needs', 'Bill - Gas',             null,             null, 100);

  // Wants — common subscriptions
  insert.run('wants', 'Subscriptions', 'Netflix',  null, 200);
  insert.run('wants', 'Subscriptions', 'Spotify',  null, 210);

  // Savings
  insert.run('savings', '401k', 'Contribution', null, 300);
  insert.run('savings', 'HSA',  'Contribution', null, 310);

  db.exec('COMMIT');
  console.log('Templates seeded successfully.');
} catch (err) {
  db.exec('ROLLBACK');
  console.error('Seed failed:', err.message);
  process.exit(1);
}
