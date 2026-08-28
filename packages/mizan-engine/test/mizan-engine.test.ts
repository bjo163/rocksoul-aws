import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateScaleFactor, calculateXp, evaluateMizan, normalizeScale } from '../src/index.ts';

test('Mizan normalization is deterministic and bounded', () => {
  assert.equal(normalizeScale({ scope: 'NATION', risk: 'HIGH' }).scope, 0.9);
  assert.equal(normalizeScale({ scope: 4 }).scope, 1);
  assert.equal(calculateScaleFactor({ scope: 'NATION' }), calculateScaleFactor({ scope: 'NATION' }));
});

test('Mizan produces bounded analytical assessment without host services', () => {
  const result = evaluateMizan({
    semantic: { R: -0.7, G: 0.1, B: 0.4, L: 0 },
    actionGateVector: [0.2],
    impactVector: [-0.8],
    scale: { scope: 'NATION', reach: 'R8', risk: 'HIGH' },
    confidence: 0.7
  });
  assert.equal(result.modelOnly, true);
  assert.equal(result.actionGateVector.length, 9);
  assert.equal(result.impactVector.length, 13);
  assert.ok(result.assessment.risk >= 0 && result.assessment.risk <= 1);
  assert.ok(result.assessment.accountabilityScore > 0);
});

test('deviation XP path remains separate from positive XP', () => {
  const result = calculateXp({ semanticVector: { weights: { 1: 1 }, primary: [1] }, scale: { scope: 'SELF' }, mode: 'DEVIATION' });
  assert.equal(result.positiveXp, 0);
  assert.ok(result.deviationScore > 0);
});
