import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeWithProvider, buildAiAnalysis } from '../src/ai/general-analyzer.js';
import { StaticSemanticProvider, LocalStructuredProvider } from '../src/ai/provider.js';

const FIXTURE = Object.freeze({
  text: 'A verified witness reports a restitution payment.',
  observation: { caseId: 'AI-GOV-FIXTURE-1', action: 'RESTITUTION', confidence: 0.8, intention: { label: 'REPAIR', confidence: 0.8, rgbl: { R: 0.2, G: 0.5, B: 0.7, L: 0.1 } }, domainVector: { JUSTICE: 0.7 }, actionGateVector: [0,0,0,0,0,0,0,0,0], impactVector: [0,0,0,0,0,0,0,0,0,0,0,0,0], timeFactor: { status: 'OBSERVED', confidence: 1 }, causality: { causal_strength: 0.5, causal_confidence: 0.8 }, evidence: [{ type: 'RECEIPT', reference: 'REC-1' }] }
});

test('AI governance rejects oversized input and bounds provider execution', async () => {
  const provider = new StaticSemanticProvider(FIXTURE.observation);
  await assert.rejects(() => analyzeWithProvider('x'.repeat(11), { provider, governance: { maxInputChars: 10 } }), /AI_INPUT_TOO_LARGE/);
  const delayed = new LocalStructuredProvider(async () => new Promise(resolve => setTimeout(() => resolve(FIXTURE.observation), 25)));
  await assert.rejects(() => analyzeWithProvider('safe', { provider: delayed, governance: { timeoutMs: 1 } }), /AI_PROVIDER_TIMEOUT/);
});

test('versioned evaluation fixture is deterministic at the engine contract boundary', async () => {
  const provider = new StaticSemanticProvider(FIXTURE.observation);
  const a = await analyzeWithProvider(FIXTURE.text, { provider });
  const b = buildAiAnalysis(FIXTURE.text, { semanticObservation: FIXTURE.observation });
  const projection = (value: any) => ({ intent: value.intent, caseId: value.caseId, semantic: value.semanticVector.semantic, evidence: value.semanticVector.evidence, action: value.candidateActions[0]?.action, review: value.reviewGate?.decision });
  assert.deepEqual(projection(a), projection(b));
  assert.deepEqual(projection(a), { intent: 'REPAIR', caseId: 'AI-GOV-FIXTURE-1', semantic: { R: 0.2, G: 0.5, B: 0.7, L: 0.1 }, evidence: [{ type: 'RECEIPT', reference: 'REC-1' }], action: 'RESTITUTION', review: 'REQUIRE_HUMAN_REVIEW' });
});
