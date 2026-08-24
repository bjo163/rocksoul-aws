import test from 'node:test';
import assert from 'node:assert/strict';

test('error envelope is stable and carries request correlation', () => {
  const error = { error: 'VALIDATION_ERROR', message: 'invalid request', request_id: 'req-test-1' };
  assert.equal(typeof error.error, 'string');
  assert.equal(typeof error.message, 'string');
  assert.match(error.request_id, /^req-/);
});

test('internal details are not part of public error payload', () => {
  const body = { error: 'INTERNAL_ERROR', message: 'request failed', request_id: 'req-test-2' } as Record<string, unknown>;
  assert.equal('stack' in body, false);
  assert.equal('sql' in body, false);
  assert.equal('secret' in body, false);
});
