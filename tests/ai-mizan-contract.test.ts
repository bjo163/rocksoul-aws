// @ts-nocheck
import assert from 'node:assert/strict';
import test from 'node:test';
import { buildAiAnalysis } from '../src/ai/general-analyzer.js';

test('AI analyzer forwards full semantic contract directly into Mizan', () => {
  const semanticObservation = {
    action: 'SEMANTIC_ACTION',
    mode: 'DEVIATION',
    confidence: 0.91,
    intention: {
      rgbl: { R: -0.7, G: -0.3, B: -0.6, L: -0.8 },
      chain: [
        { axis: 'R', value: -0.7, status: 'INFERRED', confidence: 0.91, evidence_refs: [] },
        { axis: 'G', value: -0.3, status: 'INFERRED', confidence: 0.88, evidence_refs: [], derives_from: ['R'] },
        { axis: 'B', value: -0.6, status: 'INFERRED', confidence: 0.86, evidence_refs: [], derives_from: ['R','G'] },
        { axis: 'L', value: -0.8, status: 'SUPPORTED', confidence: 0.84, evidence_refs: ['Q:5:8'], derives_from: ['R','G','B'] }
      ]
    },
    actionGateVector: [0.2, 0.1, 0, 0, 0.7, 0.8, 0.9, 0.4, 0.5],
    impactVector: [0.1, 0, 0, 0, 0.8, 0.7, 0.8, 0.8, 0.9, 0.9, 0.7, 0.4, 0.8],
    timeFactor: { intensity: 0.6, timestamp: '2026-08-20T08:00:00+07:00', phase: 'DAY' },
    causality: { causal_strength: 0.82, confidence: 0.9, actor: 'A', target: 'B', object: 'O', medium: 'M', action: 'ACT', effect: 'E' },
    domainVector: { JUSTICE: 0.91, HEALTH: 0.05 },
    evidence: [{ type: 'Q', reference: '5:8' }],
    status: 'INFERRED'
  };

  const result = buildAiAnalysis('semantic test', { semanticObservation });
  assert.equal(result.mizan?.actionGateVector.length, 9);
  assert.equal(result.mizan?.impactVector.length, 13);
  assert.equal(result.mizan?.perspectives?.R.value, -0.7);
  assert.equal(result.mizan?.perspectives?.L.value, -0.8);
  assert.equal(result.mizan?.timeFactor?.timestamp, semanticObservation.timeFactor.timestamp);
  assert.equal(result.mizan?.causality?.causal_strength, 0.82);
  assert.equal(result.mizan?.domainVector?.JUSTICE, 0.91);
  assert.deepEqual(result.semanticVector.semantic, semanticObservation.intention.rgbl);
});

test('AI analyzer fails closed without semantic observation', () => {
  const result = buildAiAnalysis('arbitrary text without semantic provider');
  assert.equal(result.intent, 'UNRESOLVED');
  assert.equal(result.mizan, null);
  assert.deepEqual(result.candidateActions, []);
});
