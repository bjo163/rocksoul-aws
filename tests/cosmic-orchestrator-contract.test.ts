import assert from 'node:assert/strict';
import test from 'node:test';
import { createCosmicEngine } from '../packages/cosmic-engine/src/index.ts';
import { runAnalysisWorkflow } from '../packages/orchestrator/src/index.ts';

test('cosmic facade composes with orchestrator and host persistence/witness ports', async () => {
  const engine = createCosmicEngine(process.cwd());
  const calls: string[] = [];
  const persisted: { aggregate?: unknown; witness?: unknown } = {};

  const result = await runAnalysisWorkflow({
    caseId: 'CASE-CONTRACT-1',
    actorId: 'ACTOR-CONTRACT-1',
    ownerRid: 'RID-CONTRACT-1',
    text: 'Saya memeriksa sumber sebelum membagikan klaim.',
    options: { locale: 'id' },
    modelVersion: '4.33.0',
    source: 'contract-test',
  }, {
    async loadCase() {
      calls.push('loadCase');
      return { version: 0 };
    },
    async listEvidence() {
      calls.push('listEvidence');
      return [{
        evidenceId: 'EVD-CONTRACT-1',
        status: 'OBSERVED',
        sourceType: 'USER',
        payload: { note: 'unverified input' },
      }];
    },
    async analyze(input) {
      calls.push('cosmic.analyze');
      assert.equal(input.text, 'Saya memeriksa sumber sebelum membagikan klaim.');
      assert.deepEqual(input.options.persistedEvidence, [{
        note: 'unverified input',
        id: 'EVD-CONTRACT-1',
        status: 'OBSERVED',
        type: 'USER',
        reference: undefined,
        confidence: undefined,
      }]);
      return engine.analyze(input.text);
    },
    async saveCase(input) {
      calls.push('saveCase');
      persisted.aggregate = input.aggregate;
      assert.equal(input.aggregate.version, 1);
      assert.equal(input.aggregate.ownerRid, 'RID-CONTRACT-1');
    },
    async commitWitness(input) {
      calls.push('commitWitness');
      persisted.witness = input;
      assert.equal(input.recordType, 'ANALYSIS');
      assert.equal(input.recordId, 'CASE-CONTRACT-1:v1');
      assert.equal(input.source, 'contract-test');
      return {
        node: { nodeId: 'NODE-CONTRACT-1', hash: 'HASH-CONTRACT-1' },
        root: 'ROOT-CONTRACT-1',
        checkpoint: { checkpoint: { checkpointId: 'CHECKPOINT-CONTRACT-1' } },
      };
    },
  });

  assert.deepEqual(calls, ['loadCase', 'listEvidence', 'cosmic.analyze', 'saveCase', 'commitWitness']);
  assert.equal(result.caseId, 'CASE-CONTRACT-1');
  assert.equal(typeof result.aggregate.analysis, 'object');
  assert.equal(result.aggregate.analysis, result.analysis);
  assert.deepEqual(result.witness, {
    nodeId: 'NODE-CONTRACT-1',
    hash: 'HASH-CONTRACT-1',
    root: 'ROOT-CONTRACT-1',
    checkpointId: 'CHECKPOINT-CONTRACT-1',
  });
  assert.ok(persisted.aggregate);
  assert.ok(persisted.witness);
});
