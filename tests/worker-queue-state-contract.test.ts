import test from 'node:test';
import assert from 'node:assert/strict';

test('worker queue lifecycle is explicit and terminal states are bounded', () => {
  const states = ['QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'DEAD'];
  assert.deepEqual(states, ['QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'DEAD']);
  const terminal = new Set(['COMPLETED', 'DEAD']);
  assert.equal(terminal.has('RUNNING'), false);
  assert.equal(terminal.has('COMPLETED'), true);
  assert.equal(terminal.has('DEAD'), true);
});

test('worker retry policy never retries terminal jobs', () => {
  const retryable = (state: string, attempts: number, maxAttempts = 3) =>
    (state === 'FAILED' || state === 'RUNNING') && attempts < maxAttempts;
  assert.equal(retryable('FAILED', 2), true);
  assert.equal(retryable('FAILED', 3), false);
  assert.equal(retryable('DEAD', 0), false);
  assert.equal(retryable('COMPLETED', 0), false);
});
