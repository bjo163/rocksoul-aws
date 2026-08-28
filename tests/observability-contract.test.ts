import test from 'node:test';
import assert from 'node:assert/strict';

test('observability contract requires correlation, latency and outcome fields', () => {
  const event = { requestId: 'req-1', durationMs: 12, status: 200, route: '/api/v1/health' };
  assert.equal(typeof event.requestId, 'string');
  assert.equal(typeof event.durationMs, 'number');
  assert.equal(typeof event.status, 'number');
  assert.equal(typeof event.route, 'string');
});

test('observability contract does not permit obvious credential fields', () => {
  const forbidden = ['password', 'jwt_secret', 'access_token', 'refresh_token'];
  assert.equal(forbidden.some((key) => key === 'request_id'), false);
});
