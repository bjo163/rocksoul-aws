import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateMizanService } from '../src/services/mizan-service.js';
import { isMizanInput, type MizanInput } from '../src/contracts/mizan.js';

test('Mizan contract accepts a valid engine payload', () => {
  const input: MizanInput = {
    semantic: { R: -0.7, G: 0, B: 0.8, L: 0.1 },
    actionGateVector: Array(9).fill(0.2),
    impactVector: Array(13).fill(0.1),
    domainVector: { HEALTH: 0.8 },
    evidenceCount: 1,
    confidence: 0.8,
    evidenceQuality: 0.75,
    semanticObservation: { action: 'SMOKING' },
  };

  assert.equal(isMizanInput(input), true);
  const result = evaluateMizanService(input);
  assert.equal(typeof result.assessment?.accountabilityScore, 'number');
  assert.equal(Array.isArray(result.actionGateVector), true);
  assert.equal(Array.isArray(result.impactVector), true);
});

test('Mizan contract rejects malformed vector values', () => {
  assert.equal(isMizanInput({ actionGateVector: [0.1, 'bad'] }), false);
  assert.equal(isMizanInput({ impactVector: 'not-an-array' }), false);
  assert.equal(isMizanInput({ confidence: '0.9' }), false);
});
