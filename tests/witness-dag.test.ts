// @ts-nocheck
import assert from 'node:assert/strict';
import { WitnessDag, hashDagNode } from '../src/ledger/witness-dag.js';

const dag = new WitnessDag();
const a = dag.append({ nodeId: 'A', kind: 'DEED', payload: { value: 1 }, parents: [], occurredAt: '2026-01-01T00:00:00.000Z', nonce: 'n-a' });
const b = dag.append({ nodeId: 'B', kind: 'DEED', payload: { value: 2 }, parents: [a.hash], occurredAt: '2026-01-01T00:00:01.000Z', nonce: 'n-b' });
const c = dag.append({ nodeId: 'C', kind: 'WITNESS', payload: { value: 3 }, parents: [a.hash], occurredAt: '2026-01-01T00:00:02.000Z', nonce: 'n-c' });
const d = dag.append({ nodeId: 'D', kind: 'MERGE', payload: { ok: true }, parents: [b.hash, c.hash], occurredAt: '2026-01-01T00:00:03.000Z', nonce: 'n-d' });

assert.equal(dag.verify().valid, true);
assert.deepEqual(dag.heads(), [d.hash]);
assert.deepEqual(dag.ancestors(d.hash), [a.hash, b.hash, c.hash].sort());
assert.equal(dag.checkpoint().nodeCount, 4);

const snapshot = dag.snapshot();
const restored = WitnessDag.fromSnapshot(snapshot);
assert.equal(restored.verify().valid, true);
assert.equal(restored.root(), dag.root());
assert.deepEqual(restored.heads(), dag.heads());

// Parent ordering must not change identity.
const body1 = { nodeId: 'X', kind: 'MERGE', payload: {}, parents: [b.hash, c.hash], occurredAt: '2026-01-01T00:00:04.000Z', actorId: null, nonce: 'n-x' };
const body2 = { ...body1, parents: [c.hash, b.hash] };
assert.equal(hashDagNode(body1), hashDagNode(body2));

// Tamper detection during import.
const tampered = { ...d, payload: { ok: false } };
assert.throws(() => {
  const t = new WitnessDag();
  t.import(a); t.import(b); t.import(c); t.import(tampered);
}, /QDAG_HASH_MISMATCH/);

console.log(JSON.stringify({ ok: true, nodes: dag.list().length, root: dag.root(), head: dag.heads()[0] }, null, 2));
