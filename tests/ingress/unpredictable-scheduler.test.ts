import assert from 'node:assert/strict';
import test from 'node:test';
import { UnpredictableIngressScheduler } from '../../src/ingress/unpredictable-scheduler.js';

test('scheduler triggers a model event and does not expose a public next-event field', async () => {
  let seen: any = null;
  const scheduler = new UnpredictableIngressScheduler({
    minDelayMs: 1_000,
    maxDelayMs: 1_100,
    onTriggered: (payload) => { seen = payload; scheduler.stop(); },
  });
  const scheduled = await scheduler.start();
  assert.equal(scheduled.unpredictable, true);
  assert.equal(scheduled.modelOnly, true);
  await new Promise((resolve) => setTimeout(resolve, 2_500));
  scheduler.stop();
  assert.ok(seen);
  assert.equal(seen.modelOnly, true);
  assert.ok(seen.triggeredAt);
});
