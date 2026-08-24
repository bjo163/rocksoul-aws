import test from 'node:test';
import assert from 'node:assert/strict';
import { fingerprintEvidence, resolveReanalysisState } from '../packages/revelation/src/reanalysis-lifecycle.ts';

test('reanalysis lifecycle is CURRENT when evidence fingerprint matches', () => {
  const evidence = [{ evidenceId: 'E2', version: 2, status: 'VERIFIED', confidence: 0.9 }, { evidenceId: 'E1', version: 1, status: 'OBSERVED', confidence: 0.6 }];
  const fingerprint = fingerprintEvidence(evidence);
  const result = resolveReanalysisState({ caseId: 'CASE-1', analysisVersion: 3, currentEvidence: evidence, analyzedEvidenceFingerprint: fingerprint });
  assert.equal(result.state, 'CURRENT');
  assert.equal(result.reason, 'MATCH');
});

test('reanalysis is required when evidence version or status changes', () => {
  const analyzed = fingerprintEvidence([{ evidenceId: 'E1', version: 1, status: 'OBSERVED' }]);
  const current = [{ evidenceId: 'E1', version: 2, status: 'VERIFIED' }];
  const result = resolveReanalysisState({ caseId: 'CASE-2', analysisVersion: 1, currentEvidence: current, analyzedEvidenceFingerprint: analyzed });
  assert.equal(result.state, 'REANALYSIS_REQUIRED');
  assert.equal(result.reason, 'EVIDENCE_CHANGED');
});

test('no prior analysis requires analysis without fabricating a historical result', () => {
  const result = resolveReanalysisState({ caseId: 'CASE-3', currentEvidence: [{ evidenceId: 'E1', version: 1 }] });
  assert.equal(result.state, 'REANALYSIS_REQUIRED');
  assert.equal(result.reason, 'NO_ANALYSIS');
  assert.equal(result.analysisEvidenceFingerprint, null);
});

test('unresolved evidence blocks deterministic promotion to current', () => {
  const result = resolveReanalysisState({
    caseId: 'CASE-4',
    analysisVersion: 2,
    currentEvidence: [{ evidenceId: 'E1', version: 2, supersededBy: '__UNRESOLVED__' }],
    analyzedEvidenceFingerprint: 'previous',
  });
  assert.equal(result.state, 'UNRESOLVED_INPUT');
  assert.equal(result.reason, 'UNRESOLVED_EVIDENCE');
});

test('fingerprint is deterministic regardless of evidence input ordering', () => {
  const a = fingerprintEvidence([{ evidenceId: 'B', version: 1 }, { evidenceId: 'A', version: 2 }]);
  const b = fingerprintEvidence([{ evidenceId: 'A', version: 2 }, { evidenceId: 'B', version: 1 }]);
  assert.equal(a, b);
});
