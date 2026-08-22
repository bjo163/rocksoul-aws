# Witness Q-DAG — v4.20.0 Single-Node Runtime (v4.19 completion baseline retained)

## Status

MoonWitness OS now contains a testable content-addressed multi-parent ledger primitive named **WitnessDag**.

`Q-DAG` is a MoonWitness project codename. The current implementation is **not quantum computing**, does not claim physical quantum entanglement, and does not claim post-quantum security. Its current guarantees are classical cryptographic guarantees built from SHA-256, canonical serialization, immutable content identities, and explicit causal parent links.

## Why this exists

The v4.14 PostgreSQL event ledger is intentionally linear (`previous_hash`). That is good for a centralized transactional journal but insufficient as the long-term primitive for offline-first, multi-node, independently witnessed history.

WitnessDag adds:

- content-addressed node identities;
- zero, one, or many causal parents;
- deterministic parent ordering;
- independently verifiable imported nodes;
- concurrent branches without destructive conflict resolution;
- deterministic Merkle root over the complete node set;
- checkpoint objects containing DAG heads + root + node count;
- ancestor traversal and complete integrity verification;
- portable snapshots.

## Storage architecture

```text
                    WITNESS / Q-DAG
                  canonical truth graph
                 /        |          \
         Local Node   Remote Node   Archive
              \          |          /
               cryptographic reconciliation
                         |
                  PostgreSQL index
             projection / query / search
                         |
                    API / Web UI
```

The atomically persisted local Q-DAG remains canonical in v4.20.0; PostgreSQL remains an optional public/query projection. Migration `0005_distributed_witness_projection` adds witness node/checkpoint/key projection tables while the Q-DAG core deliberately remains PostgreSQL-independent, preserving portability to local files, object stores, peer transports, or future replicated storage.

## Node model

Each node commits to:

- `nodeId`
- `kind`
- canonical payload
- sorted parent hashes
- occurrence time
- actor identifier
- nonce

The node hash is SHA-256 of the canonical body. Any mutation changes the hash and fails import verification.

## Concurrency

Two disconnected writers may both append from the same parent. Both branches remain valid. A later node may reference both branch heads, creating an explicit causal merge rather than overwriting either history.

## Checkpoints

A checkpoint commits to:

- all current DAG heads;
- a deterministic Merkle root of all node hashes;
- node count;
- checkpoint creation time.

In the v4.20 runtime, retaining the v4.19 witness baseline, checkpoints are signed by the persistent local Ed25519 identity and stored as **1-of-1 local checkpoints**. Distributed bundle/quorum primitives remain available as libraries but are not activated as a peer network. See `SINGLE_NODE_WITNESS.md`.

## Qur'anic design boundary

Qur'anic concepts may be used as ethical/naming inspiration for accountability, witnesses, records, measure, and preservation. They are **not presented as scientific evidence for quantum mechanics or cryptographic algorithms**. Technical claims remain independently testable.

## Implementation status / next stages

Implemented for the current one-node deployment: content-addressed DAG, deterministic Merkle root/proofs, persistent encrypted local Ed25519 identity, explicit rotation/revocation, signed local checkpoint persistence, and optional PostgreSQL public projections.

Next work should remain single-node unless requirements change: deployment recovery drills, operational metrics/UI, backup validation, and stronger external custody only if the deployment needs it. Multi-node networking is intentionally not scheduled.


## Durable local ledger

`<MOONWITNESS_DATA_DIR>/witness/qdag.json` persists the complete validated node set and expected root. Writes use temp-file + rename semantics. Startup rebuilds and verifies the snapshot before importing it. Mizan API/worker outputs are committed using hash-only `MW-MIZAN-WITNESS-V1` nodes.

## v4.20 semantic payload compatibility

Q-DAG format is unchanged. Qur'anic Mizan v4.20 changes the semantic result committed by hash, not the content-addressed ledger primitive.

## v4.28 Lifecycle provenance

Moral lifecycle changes are committed as part of the Mizan lifecycle hash. A later restorative event creates new history; it does not rewrite or delete a prior violation commitment.
