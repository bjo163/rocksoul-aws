const pg = require('pg');
const { normalizeAudit, hashAudit } = require('./packages/persistence/dist/audit.js');

const pool = new pg.Pool({ connectionString: 'postgres://postgres:Youknowm@3@localhost:5432/moonwitness' });
pool.query('SELECT * FROM audit_ledger ORDER BY chain_position ASC LIMIT 2').then(res => {
  for (let i = 0; i < res.rows.length; i++) {
    const row = res.rows[i];
    const record = normalizeAudit(row);
    console.log(`Row ${i} db hash:`, row.hash);
    console.log(`Row ${i} db prev:`, row.previous_hash);
    const prev = i === 0 ? '' : res.rows[i-1].hash;
    console.log(`Row ${i} expected prev:`, prev);
    const rehashed = hashAudit(record, prev);
    console.log(`Row ${i} rehashed :`, rehashed);
    console.log(`Match?`, row.hash === rehashed);
    console.dir(record, { depth: null });
  }
  process.exit(0);
});
