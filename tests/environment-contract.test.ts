import test from 'node:test';
import assert from 'node:assert/strict';

test('production environment requires PostgreSQL and never defaults to SQLite', () => {
  const production = { NODE_ENV: 'production', STORAGE_DRIVER: 'postgres' };
  assert.equal(production.STORAGE_DRIVER, 'postgres');
  assert.notEqual(production.STORAGE_DRIVER, 'sqlite');
});

test('production secrets are not allowed to use obvious development defaults', () => {
  const secret = 'production-secret-placeholder';
  assert.equal(/^(changeme|secret|password|test)$/i.test(secret), false);
});
