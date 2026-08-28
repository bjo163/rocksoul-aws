import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const composePath = 'deploy/coolify/docker-compose.yml';
const envPath = 'deploy/coolify/.env.example';

test('Coolify deployment uses PostgreSQL and exposes readiness healthcheck', () => {
  const compose = fs.readFileSync(composePath, 'utf8');
  assert.match(compose, /postgres/i);
  assert.match(compose, /STORAGE_DRIVER=postgres|STORAGE_DRIVER:\s*postgres/);
  assert.match(compose, /\/api\/v1\/ready/);
  assert.doesNotMatch(compose, /better-sqlite3|sqlite/i);
});

test('production environment template contains required secret/config placeholders', () => {
  const env = fs.readFileSync(envPath, 'utf8');
  for (const key of ['JWT_SECRET', 'MW_ADMIN_RID', 'MW_CORS_ORIGINS', 'WITNESS_KEY_PASSWORD']) {
    assert.match(env, new RegExp(`^${key}=`, 'm'));
  }
});
