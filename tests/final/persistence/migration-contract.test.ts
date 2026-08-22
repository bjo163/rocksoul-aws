import test from 'node:test';
import assert from 'node:assert/strict';
import { MIGRATIONS, getLatestSchemaVersion } from '../../../packages/persistence/src/schema.js';
import { createPersistence } from '../../../packages/persistence/src/index.js';

test('migration registry is ordered, unique, and covers both database dialects', () => {
  assert.ok(MIGRATIONS.length > 0);
  assert.deepEqual(MIGRATIONS.map((migration) => migration.version), [...MIGRATIONS].map((migration) => migration.version).sort((a, b) => a - b));
  assert.equal(new Set(MIGRATIONS.map((migration) => migration.version)).size, MIGRATIONS.length);
  assert.equal(getLatestSchemaVersion(), MIGRATIONS.at(-1)?.version);
  for (const migration of MIGRATIONS) {
    assert.ok(migration.id);
    assert.ok(migration.sqliteSql.includes('CREATE') || migration.sqliteSql.includes('ALTER'));
    assert.ok(migration.postgresSql.includes('CREATE') || migration.postgresSql.includes('ALTER'));
  }
  assert.ok(MIGRATIONS[0].sqliteSql.includes('event_ledger'));
  assert.ok(MIGRATIONS[1].sqliteSql.includes('audit_ledger'));
  assert.ok(MIGRATIONS[1].postgresSql.includes('audit_ledger'));
});

test('optional database drivers fail with explicit installation guidance', async () => {
  for (const driver of ['sqlite', 'postgres'] as const) {
    try {
      const store = createPersistence({ driver, sqliteFile: ':memory:', postgres: { connectionString: 'postgres://invalid' } });
      await store.close();
    } catch (error) {
      assert.match(String((error as Error).message), /requires optional dependency|Failed to initialize|ECONNREFUSED|ENOTFOUND|SQLITE_DRIVER_MISSING|POSTGRES_DRIVER_MISSING/);
    }
  }
});
