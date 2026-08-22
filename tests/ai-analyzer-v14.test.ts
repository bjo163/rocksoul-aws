// @ts-nocheck
import assert from 'node:assert/strict';
import test from 'node:test';
import { buildAiAnalysis, analyzeWithProvider } from '../src/ai/general-analyzer.js';
import { StaticSemanticProvider } from '../src/ai/provider.js';

function observation(overrides = {}) {
  return {
    action: 'SEMANTIC_ACTION', mode: 'DEVIATION', confidence: 0.88,
    intention: {
      label: 'MODEL_INTENTION',
      confidence: 0.86,
      rgbl: { R: -0.7, G: -0.3, B: -0.6, L: -0.8 },
      chain: [
        { axis: 'R', value: -0.7, status: 'INFERRED', confidence: 0.9, evidence_refs: [] },
        { axis: 'G', value: -0.3, status: 'INFERRED', confidence: 0.86, evidence_refs: [], derives_from: ['R'] },
        { axis: 'B', value: -0.6, status: 'INFERRED', confidence: 0.84, evidence_refs: [], derives_from: ['R','G'] },
        { axis: 'L', value: -0.8, status: 'SUPPORTED', confidence: 0.82, evidence_refs: ['Q:5:8'], derives_from: ['R','G','B'] }
      ]
    },
    entities: [{ type: 'PERSON', mentions: ['subject'] }],
    contexts: { place: 'observed' },
    claim: { text: 'claim', referenceCandidates: ['Q5:8'], sourceCandidates: ['quran'] },
    actionGateVector: [0.2,0.1,0,0,0.7,0.8,0.9,0.4,0.5],
    impactVector: [0.1,0,0,0,0.8,0.7,0.8,0.8,0.9,0.9,0.7,0.4,0.8],
    timeFactor: { intensity: 0.6, timestamp: '2026-08-20T08:00:00+07:00', sequence: 4, phase: 'DAY' },
    causality: { causal_strength: 0.82, confidence: 0.9, actor: 'A', target: 'B', object: 'O', medium: 'M', action: 'ACT', effect: 'E' },
    domainVector: { JUSTICE: 0.91, HEALTH: 0.05 },
    evidence: [{ type: 'Q', reference: '5:8' }],
    alternatives: [
      { id: 'ALT1', label: 'PRIMARY', probability: 0.78, status: 'INFERRED' },
      { id: 'ALT2', label: 'ALTERNATIVE', probability: 0.22, status: 'INFERRED' }
    ],
    conflicts: [{ id: 'C1', type: 'CLAIM_EVIDENCE', severity: 0.4, status: 'UNRESOLVED', sides: ['claim','evidence'] }],
    caseId: 'CASE-001',
    timeline: [
      { sequence: 1, timestamp: '2026-08-20T07:55:00+07:00', status: 'OBSERVED' },
      { sequence: 2, timestamp: '2026-08-20T08:00:00+07:00', status: 'OBSERVED' }
    ],
    ...overrides
  };
}

test('priority 1: separates observation, inference, support, and unknown', () => {
  const r = buildAiAnalysis('opaque text', { semanticObservation: observation({ status: 'INFERRED', intention: { ...observation().intention, label: 'UNKNOWN', confidence: 0 } }) });
  assert.equal(r.intent, 'UNKNOWN');
  assert.equal(r.mizan.modelOnly, true);
  assert.equal(r.confidence.band !== undefined, true);
});

test('priority 2: preserves RGBL chain, alternatives, and contradictions', () => {
  const r = buildAiAnalysis('opaque text', { semanticObservation: observation() });
  assert.deepEqual(r.mizan.semantic, { R:-0.7, G:-0.3, B:-0.6, L:-0.8 });
  assert.deepEqual(r.mizan.perspectives.G.derives_from, ['R']);
  assert.deepEqual(r.mizan.perspectives.B.derives_from, ['R','G']);
  assert.equal(r.alternatives.length, 2);
  assert.equal(r.conflicts.length, 1);
});

test('priority 3: reconstructs timeline and preserves causality', () => {
  const r = buildAiAnalysis('opaque text', { semanticObservation: observation() });
  assert.equal(r.timeline.length, 2);
  assert.equal(r.timeline[1].sequence, 2);
  assert.equal(r.mizan.causality.causal_strength, 0.82);
});

test('priority 4: keeps one case memory across analysis', () => {
  const first = buildAiAnalysis('first', { semanticObservation: observation({ caseId: 'CASE-X', caseMemory: null }) });
  const second = buildAiAnalysis('second', { semanticObservation: observation({ caseId: 'CASE-X', caseMemory: first.caseMemory }) });
  assert.equal(first.caseMemory.caseId, 'CASE-X');
  assert.equal(second.caseMemory.caseId, 'CASE-X');
  assert.equal(second.caseMemory.observations.length, 2);
});

test('priority 5: emits transparent Mizan trace', () => {
  const r = buildAiAnalysis('opaque text', { semanticObservation: observation() });
  assert.equal(r.mizan.trace.formula, 'Revelation-grounded RGBL/OUT assessment');
  assert.equal(r.mizan.trace.stages.length >= 7, true);
  assert.equal(r.mizan.trace.stages.at(-1).stage, 'ASSESSMENT');
});

test('priority 6: provider abstraction supplies the semantic observation', async () => {
  const provider = new StaticSemanticProvider(observation({ caseId: 'PROVIDER-1' }));
  const r = await analyzeWithProvider('opaque text', { provider });
  assert.equal(r.caseId, 'PROVIDER-1');
  assert.equal(r.mizan.actionGateVector.length, 9);
  assert.equal(r.mizan.impactVector.length, 13);
});

test('three distinct semantic cases produce distinct assessments without keyword rules', () => {
  const cases = [
    ['merokok', observation({ intention: { ...observation().intention, rgbl: { R:-0.15,G:0,B:0.5,L:0 } }, domainVector:{ HEALTH:0.82 } })],
    ['mencuri', observation({ intention: { ...observation().intention, rgbl: { R:-0.62,G:0,B:0.9,L:0 } }, domainVector:{ JUSTICE:0.86 } })],
    ['korupsi', observation({ intention: { ...observation().intention, rgbl: { R:-0.9,G:0,B:0.95,L:0 } }, domainVector:{ JUSTICE:0.94, GOVERNANCE:0.78 } })]
  ];
  const outputs = cases.map(([text, obs]) => buildAiAnalysis(text, { semanticObservation: obs }));
  const scores = outputs.map(r => r.mizan.assessment.accountabilityScore);
  assert.equal(new Set(scores).size, 3);
  assert.ok(outputs[1].mizan.assessment.accountabilityScore > outputs[0].mizan.assessment.accountabilityScore);
  assert.ok(outputs[2].mizan.assessment.accountabilityScore > outputs[1].mizan.assessment.accountabilityScore);
});
