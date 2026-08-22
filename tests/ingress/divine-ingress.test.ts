import assert from 'node:assert/strict';
import test from 'node:test';
import { createUnpredictableIngress, triggerIngress } from '../../src/ingress/divine-ingress.js';

test('unpredictable ingress does not expose a deterministic schedule', async () => {
  const now = new Date('2026-08-20T12:00:00.000Z');
  const first = await createUnpredictableIngress({ minDelayMs: 1_000, maxDelayMs: 10_000, now });
  const second = await createUnpredictableIngress({ minDelayMs: 1_000, maxDelayMs: 10_000, now });
  assert.equal(first.unpredictable, true);
  assert.equal(first.modelOnly, true);
  assert.notEqual(first.id, second.id);
  assert.equal(first.scheduledAt > now.toISOString(), true);
});

test('symbolic messenger channel can be triggered only as a model event', async () => {
  const payload = await createUnpredictableIngress({ channelId: 'MESSENGER-CHANNEL', minDelayMs: 1_000, maxDelayMs: 2_000 });
  const triggered = await triggerIngress(payload);
  assert.equal(triggered.channelId, 'MESSENGER-CHANNEL');
  assert.equal(triggered.eventType, 'MESSENGER_SYMBOLIC');
  assert.ok(triggered.triggeredAt);
  assert.equal(triggered.disclaimer.includes('does not claim actual revelation'), true);
});
