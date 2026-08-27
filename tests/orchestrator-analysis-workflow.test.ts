import test from 'node:test';
import assert from 'node:assert/strict';
import { runAnalysisWorkflow, runObservationWorkflow } from '../packages/orchestrator/src/index.js';

test('analysis workflow coordinates evidence, engine, persistence, and witness through ports', async () => {
  const calls: string[] = [];
  const result = await runAnalysisWorkflow({
    caseId: 'CASE-42',
    actorId: 'ACTOR-1',
    ownerRid: 'RID-1',
    text: 'A reported claim requires evidence review.',
    options: { locale: 'id' },
    semanticObservation: { protocol: 'COSMIC_SEMANTIC_OBSERVATION_V1' },
    includeReminder: true,
    reminderSeed: 7,
    modelVersion: '4.33.0',
    source: 'test',
  }, {
    async loadCase() { calls.push('loadCase'); return { version: 2, retained: true }; },
    async listEvidence() { calls.push('listEvidence'); return [{ evidenceId: 'EVD-1', status: 'VERIFIED', sourceType: 'DOCUMENT', reference: 'DOC-1', payload: { excerpt: 'source' } }]; },
    async analyze(input) {
      calls.push('analyze');
      assert.equal(input.options.locale, 'id');
      assert.deepEqual(input.options.persistedEvidence, [{ excerpt: 'source', id: 'EVD-1', status: 'VERIFIED', type: 'DOCUMENT', reference: 'DOC-1', confidence: undefined }]);
      return { mizan: { status: 'PROVISIONAL' }, semanticVector: { action: 'VERIFY_CLAIM' }, lifecycle: { state: 'OPEN' }, moralLifecycle: { state: 'REVIEW' }, reviewGate: { decision: 'REQUIRE_HUMAN_REVIEW' } };
    },
    async composeReminder(seed) { calls.push(`reminder:${seed}`); return { id: 'REM-1' }; },
    async saveCase(input) { calls.push('saveCase'); assert.equal(input.aggregate.version, 3); assert.equal(input.aggregate.ownerRid, 'RID-1'); },
    async commitWitness(input) { calls.push('commitWitness'); assert.equal(input.recordId, 'CASE-42:v3'); assert.equal(input.lifecycle.caseLifecycle && (input.lifecycle.caseLifecycle as { state: string }).state, 'OPEN'); return { node: { nodeId: 'NODE-1', hash: 'HASH-1' }, root: 'ROOT-1', checkpoint: { checkpoint: { checkpointId: 'CHK-1' } } }; },
    now: () => new Date('2026-08-28T00:00:00.000Z'),
  });

  assert.deepEqual(calls, ['loadCase', 'listEvidence', 'analyze', 'reminder:7', 'saveCase', 'commitWitness']);
  assert.equal(result.aggregate.updatedAt, '2026-08-28T00:00:00.000Z');
  assert.equal(result.analysis.reminderBundle && (result.analysis.reminderBundle as { id: string }).id, 'REM-1');
  assert.deepEqual(result.witness, { nodeId: 'NODE-1', hash: 'HASH-1', root: 'ROOT-1', checkpointId: 'CHK-1' });
});

test('observation workflow writes a versioned case and event atomically through ports', async () => {
  const calls: string[] = [];
  const result = await runObservationWorkflow({
    entityId: 'CASE-OBS-1',
    actorId: 'ACTOR-1',
    eventId: 'EVT-OBS-1',
    source: 'API',
    payload: { text: 'raw observation' },
    context: { channel: 'test' },
    ownerRid: 'RID-1',
  }, {
    async loadEntity() { calls.push('loadEntity'); return { version: 2, payload: { retained: true } }; },
    async batch(work) { calls.push('batch:start'); await work(); calls.push('batch:end'); },
    async saveEntity(input) { calls.push('saveEntity'); assert.equal(input.expectedVersion, 2); assert.equal(input.version, 3); assert.equal(input.payload.ownerRid, 'RID-1'); },
    async appendEvent(input) { calls.push('appendEvent'); assert.equal(input.eventType, 'OBSERVATION'); assert.deepEqual(input.payload.context, { channel: 'test' }); return { eventId: input.eventId }; },
    now: () => new Date('2026-08-28T00:00:00.000Z'),
  });

  assert.deepEqual(calls, ['loadEntity', 'batch:start', 'saveEntity', 'appendEvent', 'batch:end']);
  assert.deepEqual(result, { id: 'EVT-OBS-1', kind: 'OBSERVATION', status: 'RECORDED', entityId: 'CASE-OBS-1', version: 3, event: { eventId: 'EVT-OBS-1', entityId: 'CASE-OBS-1', eventType: 'OBSERVATION', payload: { observation: { text: 'raw observation' }, context: { channel: 'test' }, source: 'API' }, actorId: 'ACTOR-1', recordedAt: '2026-08-28T00:00:00.000Z' } });
});
