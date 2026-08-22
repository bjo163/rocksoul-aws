# Distributed Witness Primitives — retained in v4.20.0

## Scope

These primitives were introduced through v4.17 and remain tested library capabilities. **They are not the active deployment architecture in v4.21.0.** The current operational scope is one node; peer discovery, federation, network quorum, gossip, and consensus are deferred until a concrete requirement exists. See `SINGLE_NODE_WITNESS.md`.

Implemented primitives:

- Ed25519 witness identity generation using Node.js `node:crypto`;
- public/private identity separation;
- signed DAG checkpoints;
- trusted-key checkpoint verification;
- N-of-M checkpoint quorum evaluation with unique witness counting;
- signed portable witness bundles;
- bundle manifest hashing and tamper detection;
- deterministic import of causally complete bundles;
- reconciliation of independently produced offline branches;
- explicit causal merge after reconciliation.

## Trust boundary

A signature proves possession of the corresponding private key. It does **not** prove that the human, institution, claim, event, or payload is truthful. Trust policy therefore remains separate from cryptographic validity.

Production deployments must maintain an explicit trusted-witness registry mapping `witnessId → publicKey`. A self-supplied public key is useful for integrity but is not sufficient for institutional identity assurance.

Private keys must never be written to DAG payloads, PostgreSQL projections, logs, bundles, or source control. `publicWitness()` exists to produce a safe public identity object.

## Offline reconciliation

Disconnected nodes can share causal history and append different children. When their signed bundles are exchanged, both branches remain intact. Reconciliation unions valid content-addressed nodes. No last-write-wins rule destroys history.

After reconciliation, the receiver may append a `CAUSAL_MERGE` node whose parents are all current heads. The merge is a new historical fact; it does not rewrite either branch.

## Bundle verification

A v1 bundle commits to:

1. bundle metadata;
2. sorted node hashes;
3. checkpoint;
4. checkpoint signature;
5. manifest SHA-256;
6. Ed25519 signature over the manifest hash.

Verification reconstructs the DAG and confirms node hashes, causal parents, DAG root, heads, node count, checkpoint signature, manifest hash, and bundle signature.

## Quorum

`evaluateCheckpointQuorum()` accepts multiple signatures over the exact same checkpoint. Duplicate signatures from the same `witnessId` count once. When a trusted registry is supplied, unknown witnesses do not count.

Quorum is an application governance primitive, not a divine or absolute truth verdict.

## Current cryptographic boundary

Ed25519 remains the active classical signature implementation. v4.17.0 adds a `SignatureProvider` registry so signature algorithms can be migrated without changing Q-DAG node format. This is an interoperability boundary, not a claim of post-quantum resistance; no PQ algorithm is enabled until a standardized implementation is deliberately added and tested.

## v4.17 additions

v4.17 adds PostgreSQL/SQLite witness projection schema, `WitnessKeyring` rotation/revocation state, deterministic Merkle inclusion proofs, integrity-checked chunked bundles, `WitnessTransportService`, synchronous and queued import API routes, and PostgreSQL projection hydration/persistence. The current job worker remains the repository's in-process `PersistentJobQueue`; the transport contract is intentionally separable for a future standalone worker process.

## v4.21 operational boundary (v4.19 single-node baseline retained)

Bundle import/export remains available as a manual local utility for backup, tests, and future interoperability. The application does not automatically connect to peers. `evaluateCheckpointQuorum()` remains a library primitive but the runtime authority model for v4.20 remains a single locally signed checkpoint (`1-of-1`).

Future multi-node work is intentionally unscheduled; first prove and operate one node reliably.
