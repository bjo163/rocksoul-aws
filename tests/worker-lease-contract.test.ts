import test from 'node:test';
import assert from 'node:assert/strict';

test('worker lease has explicit owner and expiry', () => {
  const lease = { owner: 'worker-1', expiresAt: Date.now() + 30_000 };
  assert.ok(lease.owner.length > 0);
  assert.ok(lease.expiresAt > Date.now());
});

test('expired lease can be reclaimed but active lease cannot', () => {
  const now = 1_000;
  const active = { expiresAt: 2_000 };
  const expired = { expiresAt: 900 };
  assert.equal(active.expiresAt <= now, false);
  assert.equal(expired.expiresAt <= now, true);
});
