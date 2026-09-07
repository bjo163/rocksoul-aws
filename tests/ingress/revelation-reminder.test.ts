import test from 'node:test';
import assert from 'node:assert/strict';
import { composeReminderBundle } from '../../src/ingress/revelation-reminder-engine.js';

test('composes one Qur\'an ayah, two Asma references, and one prior-scripture reference metadata record', async () => {
  const bundle = await composeReminderBundle(42);
  assert.equal(bundle.delivery.ayahCount, 1);
  assert.ok(bundle.quran.reference.match(/^\d+:\d+$/));
  assert.equal(bundle.asma.length, 2);
  assert.notEqual(bundle.asma[0].candidateId, bundle.asma[1].candidateId);
  assert.ok(['TAWRAT', 'ZABUR', 'INJIL'].includes(bundle.previousScripture.book));
  assert.equal(bundle.previousScripture.referenceStatus, 'TEXT_CORPUS_REQUIRED');
  assert.equal(bundle.delivery.distributionPolicy, 'SIMULATION_ONLY');
  assert.equal(bundle.temporalContext.mode, 'CONTEXT_ONLY');
});

test('reminder composition is deterministic for the same seed', async () => {
  const a = await composeReminderBundle(123);
  const b = await composeReminderBundle(123);
  assert.deepEqual(a, b);
});
