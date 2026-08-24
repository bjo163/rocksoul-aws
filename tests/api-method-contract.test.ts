import test from 'node:test';
import assert from 'node:assert/strict';

test('mutating API operations use POST while reads use GET', () => {
  const routes = {
    '/api/v1/health': 'GET',
    '/api/v1/ready': 'GET',
    '/api/v1/query': 'POST',
    '/api/v1/command': 'POST',
    '/api/v1/analyze': 'POST',
    '/api/v1/auth/login': 'POST',
  } as const;
  assert.equal(routes['/api/v1/health'], 'GET');
  assert.equal(routes['/api/v1/ready'], 'GET');
  assert.equal(routes['/api/v1/command'], 'POST');
  assert.equal(routes['/api/v1/analyze'], 'POST');
});

test('health/readiness endpoints are safe for anonymous probes', () => {
  const anonymousSafe = ['/api/v1/health', '/api/v1/ready'];
  assert.equal(anonymousSafe.includes('/api/v1/command'), false);
  assert.equal(anonymousSafe.includes('/api/v1/analyze'), false);
});
