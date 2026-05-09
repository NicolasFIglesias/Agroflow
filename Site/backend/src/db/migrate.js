const fs   = require('fs');
const path = require('path');
const db   = require('./index');

async function runMigrations() {
  // Create tracking table if it doesn't exist
  await db.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      filename TEXT PRIMARY KEY,
      executed_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  const dir   = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort();

  for (const file of files) {
    const { rows } = await db.query('SELECT 1 FROM _migrations WHERE filename=$1', [file]);
    if (rows.length) continue;

    const sql = fs.readFileSync(path.join(dir, file), 'utf8');
    try {
      await db.query(sql);
      await db.query('INSERT INTO _migrations (filename) VALUES ($1)', [file]);
      console.log(`[migrate] ✓ ${file}`);
    } catch (err) {
      console.error(`[migrate] ✗ ${file}:`, err.message);
    }
  }
}

module.exports = runMigrations;
