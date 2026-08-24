import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryRateLimiter } from '../src/security/rate-limiter.js';

test('memory rate limiter enforces a fixed window and returns retry metadata', () => {
  const limiter = new MemoryRateLimiter(2, 1_000);
  const first = limiter.check('client', 0);
  const second = limiter.check('client', 1);
  const third = limiter.check('client', 2);
  assert.equal(first.allowed, true);
  assert.equal(first.remaining, 1);
  assert.equal(second.allowed, true);
  assert.equal(second.remaining, 0);
  assert.equal(third.allowed, false);
  assert.equal(third.resetAt, 1_000);
});

test('memory rate limiter resets after the window', () => {
  const limiter = new MemoryRateLimiter(1, 100);
  assert.equal(limiter.check('client', 0).allowed, true);
  assert.equal(limiter.check('client', 50).allowed, false);
  assert.equal(limiter.check('client', 100).allowed, true);
});

test('memory rate limiter rejects invalid configuration and blank keys', () => {
  assert.throws(() => new MemoryRateLimiter(0, 1_000), /RATE_LIMIT_INVALID_LIMIT/);
  assert.throws(() => new MemoryRateLimiter(1, 0), /RATE_LIMIT_INVALID_WINDOW/);
  const limiter = new MemoryRateLimiter(1, 1_000);
  assert.throws(() => limiter.check('  '), /RATE_LIMIT_KEY_REQUIRED/);
});
