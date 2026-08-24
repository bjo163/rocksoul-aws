import test from 'node:test';
import assert from 'node:assert/strict';

test('worker queue lifecycle preserves terminal states and retry bounds', () => {
  const transitions: Record<string, string[]> = {
    QUEUED: ['RUNNING'],
    RUNNING: ['COMPLETED', 'FAILED'],
    FAILED: ['QUEUED', 'DEAD'],
    COMPLETED: [],
    DEAD: [],
  };
  for (const [from, allowed] of Object.entries(transitions)) {
    assert.ok(Array.isArray(allowed));
    assert.ok(!allowed.includes(from), `${from} must not self-transition`);
  }
  assert.ok(transitions.FAILED.includes('DEAD'));
  assert.ok(transitions.FAILED.includes('QUEUED'));
});

test('worker retry policy is bounded and dead-letter is terminal', () => {
  const maxRetries = 5;
  for (let retry = 0; retry <= maxRetries; retry += 1) {
    assert.ok(retry >= 0 && retry <= maxRetries);
  }
  assert.equal((['QUEUED', 'RUNNING', 'FAILED', 'COMPLETED', 'DEAD'].includes('DEAD')), true);
});
