import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const router = fs.readFileSync(path.resolve('apps/api/src/router.ts'), 'utf8');
const required = [
  ['/api/v1/health', 'GET'],
  ['/api/v1/ready', 'GET'],
  ['/api/v1/auth/login', 'POST'],
  ['/api/v1/auth/refresh', 'POST'],
  ['/api/v1/auth/logout', 'POST'],
  ['/api/v1/command', 'POST'],
  ['/api/v1/query', 'POST'],
  ['/api/v1/analyze', 'POST'],
  ['/api/v1/mizan', 'POST'],
];

test('canonical API routes remain present in native router', () => {
  for (const [route, method] of required) {
    assert.match(router, new RegExp(`['\"]${route.replaceAll('/', '\\/')}['\"]`), `${method} ${route} route missing`);
  }
});
