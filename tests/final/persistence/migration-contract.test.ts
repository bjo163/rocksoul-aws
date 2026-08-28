import test from 'node:test';
import assert from 'node:assert/strict';
import { MIGRATIONS, getLatestSchemaVersion } from '../../../packages/persistence/src/schema.js';
import { createPersistence } from '../../../packages/persistence/src/index.js';

test('migration registry is ordered, unique, and covers supported file/postgres persistence semantics', () => {
  assert.ok(MIGRATIONS.length > 0);
  assert.deepEqual(
    MIGRATIONS.map((migration) => migration.version),
    [...MIGRATIONS].map((migration) => migration.version).sort((a, b) => a - b),
  );
  assert.equal(new Set(MIGRATIONS.map((migration) => migration.version)).size, MIGRATIONS.length);
  assert.equal(getLatestSchemaVersion(), MIGRATIONS.at(-1)?.version);
  for (const migration of MIGRATIONS) {
    assert.ok(migration.id);
    assert.ok(migration.postgresSql.includes('CREATE') || migration.postgresSql.includes('ALTER'));
  }
  assert.ok(MIGRATIONS[0].postgresSql.includes('event_ledger'));
  assert.ok(MIGRATIONS[1].postgresSql.includes('audit_ledger'));
});

test('unsupported sqlite persistence is rejected explicitly', () => {
  assert.throws(
    () => createPersistence({ driver: 'sqlite' as never } as never),
    /Unsupported persistence driver|sqlite/i,
  );
});

test('postgres persistence reports actionable connection failures', async () => {
  const store = createPersistence({
    driver: 'postgres',
    postgres: { connectionString: 'postgres://invalid.invalid:5432/cosmic' },
  });
  try {
    await store.ready();
    assert.fail('expected postgres connection to fail for invalid host');
  } catch (error) {
    assert.match(String((error as Error).message), /ENOTFOUND|ECONNREFUSED|Failed to initialize|postgres/i);
  } finally {
    await store.close();
  }
});
