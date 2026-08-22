// @ts-nocheck
import assert from 'node:assert/strict';
import test from 'node:test';
import { buildAiAnalysis } from '../src/ai/general-analyzer.js';

test('AI analysis includes one-case lifecycle through final model state', () => {
  const observation = {
    intent: 'CASE_ANALYSIS',
    action: 'SEMANTIC_ACTION',
    mode: 'DEVIATION',
    confidence: 0.9,
    intention: { label: 'UNAUTHORIZED_GAIN', confidence: 0.8, rgbl: { R: -0.5, G: -0.3, B: -0.7, L: -0.4 } },
    actionGateVector: [0.2, 0.1, 0, 0, 0.5, 0.8, 0.9, 0.3, 0.4],
    impactVector: [0.1, 0.1, 0, 0, 0.6, 0.7, 0.8, 0.8, 0.9, 0.9, 0.7, 0.4, 0],
    timeFactor: { intensity: 0.4 },
    causality: { causal_strength: 0.8 },
    domainVector: { JUSTICE: 0.8 },
    evidence: []
  };
  const result = buildAiAnalysis('synthetic semantic case', { semanticObservation: observation });
  assert.ok(result.lifecycle);
  assert.deepEqual(result.lifecycle.phases.map(x => x.state), [
    'DUNYA','DYING','DECEASED','BARZAKH','RESURRECTION','MAHSHAR','HISAB','MIZAN','FINAL_STATE'
  ]);
  assert.equal(result.lifecycle.final.destination, 'NOT_DETERMINABLE');
  assert.equal(result.lifecycle.final.divineVerdict, 'OUTSIDE_MODEL');
  assert.equal(result.lifecycle.modelOnly, true);
});

test('analysis without semantic observation does not fabricate lifecycle', () => {
  const result = buildAiAnalysis('unresolved text');
  assert.equal(result.lifecycle, null);
});
