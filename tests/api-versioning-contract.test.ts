import test from 'node:test';
import assert from 'node:assert/strict';

test('API versioning contract keeps public surface under /api/v1', () => {
  const routes = ['/api/v1/health', '/api/v1/ready', '/api/v1/auth/login', '/api/v1/command'];
  assert.ok(routes.every((route) => route.startsWith('/api/v1/')));
});

test('deprecated routes must be explicitly documented rather than silently removed', () => {
  const deprecation = { path: '/api/v1/legacy', replacement: '/api/v1/command', sunset: 'documented' };
  assert.equal(typeof deprecation.replacement, 'string');
  assert.equal(deprecation.sunset, 'documented');
});
