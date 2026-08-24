import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync('apps/api/src/app.ts', 'utf8');

test('API startup waits for persistence readiness before serving traffic', () => {
  assert.match(app, /await universeStore\.persistence\.ready\(\)/);
});

test('production deployment healthcheck uses readiness endpoint', () => {
  const compose = fs.readFileSync('deploy/coolify/docker-compose.yml', 'utf8');
  assert.match(compose, /api\/v1\/ready/);
});
