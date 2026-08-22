import assert from 'node:assert/strict';
import { buildHumanReviewGate } from '../src/ai/human-review-gate.js';
import { createDefaultSemanticProvider } from '../src/ai/provider.js';
import { buildAiAnalysis } from '../src/ai/general-analyzer.js';

const provisional = buildHumanReviewGate({
  observed: { quranGrounding: { coverage: 'DIRECT', direct: ['Q5:38'] } },
  quranicMizan: { status: 'PROVISIONAL', epistemic: { evidenceState: 'UNVERIFIED_REPORT' }, quranGrounding: { coverage: 'DIRECT' } },
  scorecard: { grounding: { refs: ['Q5:38'] } }
});
assert.equal(provisional.protocol, 'HUMAN_REVIEW_GATE_V1');
assert.equal(provisional.decision, 'REQUIRE_HUMAN_REVIEW');
assert.equal(provisional.adverseActionBlocked, true);
assert.ok(provisional.evidenceGap.includes('VERIFY_FACTUAL_EVENT'));

const conflict = buildHumanReviewGate({
  observed: { eventInterpretation: { conflictResolution: { state: 'ACTUAL_CONFLICT' } } },
  quranicMizan: { status: 'PROVISIONAL', epistemic: { conflictPresent: true } }
});
assert.equal(conflict.decision, 'BLOCK_ADVERSE_ACTION');
assert.equal(conflict.severity, 'CRITICAL');
assert.ok(conflict.reasons.some(reason => reason.code === 'ACTUAL_CONFLICT'));

const reserved = buildHumanReviewGate({ quranicMizan: { status: 'RESERVED' } });
assert.equal(reserved.decision, 'BLOCK_ADVERSE_ACTION');
assert.ok(reserved.evidenceGap.includes('FINAL_OUTCOME_IS_NOT_OBSERVABLE'));

const provider = createDefaultSemanticProvider(process.cwd());
const observation = await provider.analyze('Saya rutin merokok setiap hari.');
const result = buildAiAnalysis('Saya rutin merokok setiap hari.', { semanticObservation: observation });
assert.equal(result.reviewGate.protocol, 'HUMAN_REVIEW_GATE_V1');
assert.equal(result.reviewGate.adverseActionBlocked, true);
assert.equal(result.reviewGate.requiresHumanReview, true);
assert.ok(result.reviewGate.reasons.length > 0);

console.log(JSON.stringify({ ok: true, cases: 4, protocol: 'HUMAN_REVIEW_GATE_V1' }));
