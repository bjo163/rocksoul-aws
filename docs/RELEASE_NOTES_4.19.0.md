# MoonWitness OS v4.19.0 — Single-Node Completion Baseline

## Scope

v4.19.0 completes the current **one-node** operating baseline. It does not activate peer discovery, gossip, federation, network quorum, or consensus.

The release closes the operational gaps left after v4.18: Q-DAG durability across restart, verifiable Mizan commitments, backup/recovery, diagnostics, and witness observability.

## Canonical local Q-DAG persistence

The single-node Q-DAG is now persisted atomically at:

```text
<MOONWITNESS_DATA_DIR>/witness/qdag.json
```

The local Q-DAG is the canonical witness ledger for the one-node runtime. PostgreSQL remains a public/query projection. When PostgreSQL is enabled, startup uses it as a recovery source only when the local Q-DAG is empty or missing, then synchronizes the canonical local state back to the projection.

This closes the v4.18 restart gap where key identity survived but non-PostgreSQL Q-DAG nodes could otherwise be memory-only.

## Mizan → Q-DAG commitments

The following paths now commit their result into Q-DAG:

- `POST /api/v1/analyze`
- `POST /api/v1/evaluate`
- authenticated/authorized `POST /api/v1/ai/analyze`
- persistent `AI_ANALYZE` jobs

The witness node stores hashes/commitments for input, Mizan output, semantic output, lifecycle, and combined result. The raw input text and full readable analysis are **not copied into Q-DAG**.

This is an integrity/audit commitment, not zero-knowledge privacy and not proof that the underlying content is factually correct.

By default a successful Mizan commitment also creates a signed local 1-of-1 checkpoint. Set `WITNESS_AUTO_CHECKPOINT=0` to disable automatic checkpoints and create them explicitly through the witness API.

## Backup and recovery

Added verified single-node backups containing:

- encrypted witness keystore;
- signed checkpoint history;
- canonical Q-DAG file when present;
- independent Q-DAG snapshot;
- SHA-256 manifest with byte counts and expected Q-DAG root/node count.

The backup intentionally excludes `WITNESS_KEY_PASSWORD` and the development `.local-master-secret`. These secrets must be protected separately.

Commands:

```bash
npm run witness:backup
npm run witness:recovery-drill
npm run witness:diagnostics
```

The recovery drill is non-destructive: it restores the latest backup into a temporary directory, decrypts the restored keystore with the currently supplied witness password, rebuilds the Q-DAG, checks the expected root, and verifies checkpoint signatures.

## Diagnostics and observability

New API endpoints:

```text
GET  /api/v1/witness/metrics
GET  /api/v1/witness/diagnostics
POST /api/v1/witness/backups
GET  /api/v1/witness/backups
GET  /api/v1/witness/backups/:backupId/verify
```

Diagnostics classify the node as `HEALTHY`, `DEGRADED`, or `FAILED` based on Q-DAG integrity, encrypted-keystore presence, signing-key availability, checkpoint signature validity, and latest backup validity.

Runtime witness counters cover node commitments, checkpoints, key lifecycle operations, backup creation, restore completion, and diagnostics. They are runtime telemetry and are not part of the immutable ledger.

## Verification

`npm run test:witness` now runs seven regression/integration test files and verifies:

- deterministic Q-DAG integrity;
- previous distributed primitive regressions;
- Merkle/key/chunk regressions from v4.17;
- persistent encrypted single-node identity from v4.18;
- local Q-DAG restart persistence;
- Mizan hash-only commitment behavior;
- backup manifest verification;
- full non-destructive recovery drill;
- restored checkpoint validation;
- healthy diagnostics for a correctly backed-up node;
- concurrent FileProvider load/flush safety;
- HTTP witness persistence, backup, metrics, diagnostics, and restart behavior.

Live PostgreSQL execution is still environment-dependent and is not claimed without an accessible PostgreSQL server.


## Additional runtime hardening

The file persistence adapter now serializes first-load initialization and atomic flush operations with unique temp files. This fixes a pre-existing concurrency race where simultaneous observability/job/request writes could reuse the same `.tmp` path or initialize competing in-memory states. The legacy backend loader also prefers transpiled `.js` sources when both `.js` and `.ts` exist, making the repository transpile runner deterministic. The API/web static contract test was updated for the modular `/api/v1/*` route layout, and `/api/v1/prophets` now matches the existing web client contract.


Anonymous `/api/v1/ai/analyze` calls do not append immutable witness nodes. This preserves the existing public analysis behavior without allowing unauthenticated callers to grow the canonical ledger. Authorized callers receive the Q-DAG commitment.
