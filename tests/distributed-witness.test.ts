// @ts-nocheck
import assert from 'node:assert/strict';
import { WitnessDag } from '../src/ledger/witness-dag.js';
import {
  createWitnessIdentity,
  publicWitness,
  signCheckpoint,
  verifySignedCheckpoint,
  evaluateCheckpointQuorum,
  exportWitnessBundle,
  verifyWitnessBundle,
  importWitnessBundle,
  reconcileWitnessBundles,
} from '../src/ledger/distributed-witness.js';

const alice = createWitnessIdentity('alice', '2026-08-22T00:00:00.000Z');
const bob = createWitnessIdentity('bob', '2026-08-22T00:00:00.000Z');
const carol = createWitnessIdentity('carol', '2026-08-22T00:00:00.000Z');
assert.equal(publicWitness(alice).privateKey, undefined);

const source = new WitnessDag();
const genesis = source.append({ nodeId: 'GEN', kind: 'GENESIS', payload: { v: 1 }, parents: [], occurredAt: '2026-08-22T00:00:01.000Z', nonce: 'g' });
source.append({ nodeId: 'A1', kind: 'OBSERVATION', payload: { value: 7 }, parents: [genesis.hash], occurredAt: '2026-08-22T00:00:02.000Z', nonce: 'a1' });

const checkpoint = source.checkpoint('2026-08-22T00:00:03.000Z');
const sa = signCheckpoint(checkpoint, alice);
const sb = signCheckpoint(checkpoint, bob);
const sc = signCheckpoint(checkpoint, carol);
assert.equal(verifySignedCheckpoint(sa, alice.publicKey), true);
assert.equal(verifySignedCheckpoint(sa, bob.publicKey), false);
const quorum = evaluateCheckpointQuorum([sa, sb, sc], {
  threshold: 2,
  trustedWitnesses: { alice: alice.publicKey, bob: bob.publicKey, carol: carol.publicKey },
});
assert.equal(quorum.valid, true);
assert.equal(quorum.approvals, 3);

const bundle = exportWitnessBundle(source, alice, '2026-08-22T00:00:04.000Z');
assert.equal(verifyWitnessBundle(bundle, alice.publicKey).valid, true);
const target = new WitnessDag();
const imported = importWitnessBundle(target, bundle, alice.publicKey);
assert.equal(imported.imported, 2);
assert.equal(target.root(), source.root());

const tampered = structuredClone(bundle);
tampered.nodes[1].payload.value = 999;
assert.equal(verifyWitnessBundle(tampered, alice.publicKey).valid, false);

// Offline branches: both witnesses start from the same genesis, then diverge.
const left = new WitnessDag(); left.import(genesis);
left.append({ nodeId: 'LEFT', kind: 'OFFLINE', payload: { side: 'left' }, parents: [genesis.hash], occurredAt: '2026-08-22T00:01:00.000Z', nonce: 'l' });
const right = new WitnessDag(); right.import(genesis);
right.append({ nodeId: 'RIGHT', kind: 'OFFLINE', payload: { side: 'right' }, parents: [genesis.hash], occurredAt: '2026-08-22T00:01:01.000Z', nonce: 'r' });
const leftBundle = exportWitnessBundle(left, alice, '2026-08-22T00:02:00.000Z');
const rightBundle = exportWitnessBundle(right, bob, '2026-08-22T00:02:01.000Z');
const reconciled = reconcileWitnessBundles([leftBundle, rightBundle], { alice: alice.publicKey, bob: bob.publicKey });
assert.equal(reconciled.rejectedBundles.length, 0);
assert.equal(reconciled.dag.list().length, 3);
assert.equal(reconciled.dag.heads().length, 2);
const merge = reconciled.dag.append({ nodeId: 'MERGE', kind: 'CAUSAL_MERGE', payload: { reconciled: true }, parents: reconciled.dag.heads(), occurredAt: '2026-08-22T00:03:00.000Z', nonce: 'm' });
assert.equal(reconciled.dag.heads()[0], merge.hash);
assert.equal(reconciled.dag.verify().valid, true);

console.log(JSON.stringify({
  ok: true,
  algorithm: 'Ed25519',
  quorum: `${quorum.approvals}/${quorum.threshold}`,
  reconciledNodes: reconciled.dag.list().length,
  root: reconciled.dag.root(),
}, null, 2));
