import assert from 'node:assert/strict';
import test from 'node:test';
import { createCosmicEngine, toCosmicSemanticObservation } from '../src/index.js';

test('Cosmic facade is deterministic and host-neutral', async () => {
  const engine = createCosmicEngine();
  const first = await engine.analyzeSemantic('ambiguous input');
  const second = await engine.analyzeSemantic('ambiguous input');
  assert.deepEqual(first, second);
  assert.equal(first.protocol, 'COSMIC_SEMANTIC_OBSERVATION_V1');
  assert.equal(first.status, 'AVAILABLE');
  assert.ok(Array.isArray(first.candidates));
});

test('Cosmic facade keeps provider observations non-authoritative', () => {
  const result = toCosmicSemanticObservation({
    status: 'INFERRED',
    actionCandidates: [{ action: 'REVIEW', score: 2, matchedAlias: 'review' }],
    epistemicSignals: { intentional: true },
  });
  assert.equal(result.candidates[0]?.confidence, 1);
  assert.deepEqual(result.intentionSignals, ['DECLARED_INTENT_SIGNAL']);
  assert.match(result.diagnostics[0], /non-authoritative/);
});

test('Cosmic facade exposes bounded Mizan evaluation', () => {
  const engine = createCosmicEngine();
  const result = engine.evaluateMizan({ semantic: { R: 1, G: 0, B: 0, L: 0 } });
  assert.equal(result.modelOnly, true);
  assert.ok(Number.isFinite(result.raw));
  assert.ok(result.raw >= 0 && result.raw <= 100);
});
