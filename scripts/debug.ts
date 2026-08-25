import pg from 'pg';
import { normalizeAudit, hashAudit } from '../packages/persistence/src/audit.js';

const pool = new pg.Pool({ connectionString: 'postgres://postgres:Youknowm@3@localhost:5432/moonwitness' });
pool.query('SELECT * FROM audit_ledger ORDER BY chain_position ASC LIMIT 2').then(res => {
  const row1 = res.rows[1];
  const record1 = normalizeAudit(row1);
  console.log('DB hash:', row1.hash);
  console.log('DB prev:', row1.previous_hash);
  console.log('hashAudit(record1, ""):', hashAudit(record1, ''));
  console.log('hashAudit(record1, row1.previous_hash):', hashAudit(record1, row1.previous_hash));
  process.exit(0);
});
