import { createPersistence } from '../packages/persistence/src/factory.js';
import { normalizeAudit, hashAudit } from '../packages/persistence/src/audit.js';
import { loadDatabaseConfig } from '../src/config-loader.js';

async function test() {
  const store = createPersistence({
    driver: 'postgres',
    postgres: {
      host: process.env.PGHOST ?? 'localhost',
      port: 5432,
      database: 'moonwitness',
      user: 'postgres',
      password: process.env.PGPASSWORD ?? 'change-me'
    }
  });

  const pgStore = store as any;
  // wait for it to be ready
  await pgStore.ready();
  const result = await pgStore.pool.query('SELECT * FROM audit_ledger ORDER BY chain_position ASC');
  
  let previous = '';
  for (const row of result.rows) {
    const record = normalizeAudit(row);
    const calculatedHash = hashAudit(record, previous);
    if (row.previous_hash !== previous || calculatedHash !== row.hash) {
      console.log(`Audit ID: ${record.auditId}`);
      console.log(`Stored Previous Hash: ${row.previous_hash}`);
      console.log(`Passed Previous Hash: ${previous}`);
      console.log(`Stored Hash: ${row.hash}`);
      console.log(`Calculated Hash: ${calculatedHash}`);
      console.log('--- MISMATCH FOUND ---');
    }
    previous = row.hash;
  }
  const missing = await pgStore.pool.query('SELECT * FROM audit_ledger WHERE hash = $1', ['e516a0770fce46653d758b824dcd2a871adb52a8274964de7ef1467d7ae92084']);
  console.log('Missing row from DB:', JSON.stringify(missing.rows[0], null, 2));

  // let's also find what row had hash 2f552b4e66a9d31b221ae14d44cce27ff0b03a1b848a9f8ecf3520ca73f89e5d
  const prevRow = await pgStore.pool.query('SELECT * FROM audit_ledger WHERE hash = $1', ['2f552b4e66a9d31b221ae14d44cce27ff0b03a1b848a9f8ecf3520ca73f89e5d']);
  console.log('Passed previous row from DB:', JSON.stringify(prevRow.rows[0], null, 2));
  await store.close();
}

test().catch(console.error);
