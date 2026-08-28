import test from 'node:test';
import assert from 'node:assert/strict';
import { runAiAnalyzeWorkflow } from '../packages/orchestrator/src/ai-analysis-workflow.js';

test('AI analysis workflow coordinates evidence, reminder, case, and witness ports', async () => {
  const calls: string[] = [];
  const result = await runAiAnalyzeWorkflow({ caseId: 'CASE-JOB', actorId: 'WORKER-1', text: 'claim', options: { includeReminder: true, reminderSeed: 4 }, modelVersion: '4.33.0', source: 'persistent-job' }, {
    async listEvidence() { calls.push('evidence'); return [{ evidenceId: 'E-1', status: 'VERIFIED', sourceType: 'DOCUMENT', payload: { excerpt: 'source' } }]; },
    async analyze(input) { calls.push('analyze'); assert.equal(input.options.persistedEvidence?.[0]?.id, 'E-1'); return { mizan: { status: 'PROVISIONAL' }, semanticVector: { action: 'VERIFY' }, lifecycle: { state: 'OPEN' } }; },
    async composeReminder(seed) { calls.push(`reminder:${seed}`); return { id: 'REM-1' }; },
    async saveCase(input) { calls.push('save'); assert.equal(input.aggregate.version, 1); },
    async commitWitness(input) { calls.push('witness'); assert.equal(input.recordType, 'AI_ANALYSIS'); return { node: { nodeId: 'N-1', hash: 'H-1' }, root: 'R-1', checkpointId: 'C-1' }; },
    now: () => new Date('2026-08-28T00:00:00.000Z'),
  });
  assert.deepEqual(calls, ['evidence', 'analyze', 'reminder:4', 'save', 'witness']);
  assert.equal(result.analysis.reminderBundle && (result.analysis.reminderBundle as { id: string }).id, 'REM-1');
  assert.deepEqual(result.witness, { nodeId: 'N-1', hash: 'H-1', root: 'R-1', checkpointId: 'C-1' });
});

test('AI analysis workflow fails closed when witness root is missing', async () => {
  await assert.rejects(() => runAiAnalyzeWorkflow({ caseId: 'CASE-BLOCKED', actorId: 'WORKER-1', text: 'claim', modelVersion: '4.33.0', source: 'test' }, {
    async listEvidence() { return []; },
    async analyze() { return {}; },
    async saveCase() {},
    async commitWitness() { return { node: { nodeId: 'N-1', hash: 'H-1' }, root: null }; },
  }), /WITNESS_ROOT_MISSING/);
});
