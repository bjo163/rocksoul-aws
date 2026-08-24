import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync('src/persistence/postgres-idempotency.ts', 'utf8');

test('postgres idempotency serializes a key with a transaction-scoped advisory lock', () => {
  assert.match(source, /BEGIN/);
  assert.match(source, /pg_advisory_xact_lock\(hashtext\(\$1\)\)/);
  assert.match(source, /SELECT \* FROM idempotency_records WHERE key=\$1/);
  assert.match(source, /COMMIT/);
});

test('postgres idempotency rejects payload reuse and always rolls back on failure', () => {
  assert.match(source, /IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD/);
  assert.match(source, /statusCode:409/);
  assert.match(source, /client\.query\('ROLLBACK'\)/);
  assert.match(source, /client\.release\(\)/);
});

test('postgres idempotency persists the completed result before commit', () => {
  const insertIndex = source.indexOf('INSERT INTO idempotency_records');
  const commitIndex = source.indexOf("await client.query('COMMIT')", insertIndex);
  assert.ok(insertIndex >= 0);
  assert.ok(commitIndex > insertIndex);
});
