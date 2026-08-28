import test from 'node:test';
import assert from 'node:assert/strict';
import { WitnessDag, appendMizanWitness, createWitnessIdentity, exportWitnessBundle, verifyWitnessBundle } from '../src/index.js';

test('Witness package exports deterministic DAG and Mizan commitment primitives', () => {
  const dag = new WitnessDag();
  const node = appendMizanWitness(dag, {
    recordId: 'PACKAGE-1',
    recordType: 'EVALUATION',
    text: 'private input must not be stored',
    mizan: { direction: 'NEUTRAL' },
    semantic: { score: 0.4 },
    lifecycle: { state: 'OBSERVED' },
    reviewGate: { protocol: 'HUMAN_REVIEW_GATE_V1', requiresHumanReview: false, adverseActionBlocked: false, reasons: [] },
    modelVersion: '4.33.0',
  });
  assert.equal(node.kind, 'MIZAN.EVALUATION');
  assert.equal(dag.verify().valid, true);
  assert.equal(dag.snapshot().nodes[0].payload.inputHash.length, 64);
  assert.equal(JSON.stringify(dag.snapshot()).includes('private input'), false);
});

test('Witness package exports signed bundle round-trip primitives', () => {
  const dag = new WitnessDag();
  dag.append({ nodeId: 'PACKAGE-NODE-1', kind: 'TEST', payload: { ok: true }, occurredAt: '2026-01-01T00:00:00.000Z' });
  const identity = createWitnessIdentity('PACKAGE-WITNESS-1', '2026-01-01T00:00:00.000Z');
  const bundle = exportWitnessBundle(dag, identity, '2026-01-01T00:00:00.000Z');
  assert.equal(verifyWitnessBundle(bundle).valid, true);
  assert.equal(bundle.sourceWitnessId, 'PACKAGE-WITNESS-1');
});
