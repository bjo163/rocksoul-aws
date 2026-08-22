import test from 'node:test';
import assert from 'node:assert/strict';
import { composeReminderBundle } from '../../src/ingress/revelation-reminder-engine.js';
import { createUnpredictableIngress } from '../../src/ingress/divine-ingress.js';

test('goal path: sourced reminder bundle is complete and deterministic', async () => {
  const bundle = await composeReminderBundle(20260820);
  assert.equal(bundle.delivery.ayahCount, 1);
  assert.equal(bundle.asma.length, 2);
  assert.notEqual(bundle.asma[0].id, bundle.asma[1].id);
  assert.ok(/^\d+:\d+$/.test(bundle.quran.reference));
  assert.ok(['TAWRAT','ZABUR','INJIL'].includes(bundle.previousScripture.book));
  assert.equal(bundle.temporalContext.mode, 'CONTEXT_ONLY');
  assert.equal(bundle.delivery.distributionPolicy, 'SIMULATION_ONLY');
  assert.equal((await composeReminderBundle(20260820)).id, bundle.id);
});

test('goal path: unpredictable ingress carries the sourced bundle', async () => {
  const payload = await createUnpredictableIngress({ minDelayMs: 1000, maxDelayMs: 2000, now: new Date('2026-08-20T12:00:00Z') });
  assert.ok(payload.reminderBundle);
  assert.equal(payload.reminderBundle?.delivery.ayahCount, 1);
  assert.equal(payload.unpredictable, true);
  assert.equal(payload.modelOnly, true);
});
