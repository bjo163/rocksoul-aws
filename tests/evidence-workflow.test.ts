import test from 'node:test';
import assert from 'node:assert/strict';
import { EvidenceWorkflowError, runEvidenceWorkflow } from '../packages/orchestrator/src/evidence-workflow.js';

test('evidence workflow records a normalized immutable evidence record', async () => {
  const calls: string[] = [];
  const result = await runEvidenceWorkflow({ entityId: 'CASE-1', actorId: 'USER-1', evidenceId: 'EVD-1', status: 'verified', sourceType: 'DOCUMENT', confidence: 2, payload: { note: 'source' }, submittedThrough: 'test' }, {
    async listEvidence() { calls.push('list'); return []; },
    async saveEvidence(record) { calls.push('save'); return record; },
  });
  assert.deepEqual(calls, ['list', 'save']);
  assert.equal(result.id, 'CASE-1');
  assert.equal(result.evidence.status, 'VERIFIED');
  assert.equal(result.evidence.confidence, 1);
  assert.equal(result.reanalysisRequired, true);
});

test('evidence workflow fails closed before save for duplicate and invalid supersession', async () => {
  const calls: string[] = [];
  const ports = {
    async listEvidence() { calls.push('list'); return [{ evidenceId: 'EVD-1', payload: {} }]; },
    async saveEvidence() { calls.push('save'); throw new Error('must not save'); },
  };
  await assert.rejects(() => runEvidenceWorkflow({ entityId: 'CASE-1', actorId: 'USER-1', evidenceId: 'EVD-1' }, ports), (error: unknown) => error instanceof EvidenceWorkflowError && error.code === 'EVIDENCE_IMMUTABLE');
  await assert.rejects(() => runEvidenceWorkflow({ entityId: 'CASE-1', actorId: 'USER-1', evidenceId: 'EVD-2', supersedes: 'EVD-1' }, ports), (error: unknown) => error instanceof EvidenceWorkflowError && error.code === 'SUPERSESSION_REASON_REQUIRED');
  assert.deepEqual(calls, ['list', 'list']);
});
