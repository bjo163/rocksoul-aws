# Single-Node Witness Runtime — v4.20.0 (v4.19 baseline retained)

## Operational scope

MoonWitness currently targets **one node**. Multi-node discovery, gossip, federation, network quorum, and consensus remain intentionally inactive. Distributed-witness primitives retained from earlier releases are library capabilities, not the current deployment architecture.

## Canonical witness state

The one-node witness runtime has four local persistence artifacts:

```text
<MOONWITNESS_DATA_DIR>/witness/
  keystore.json.enc    # encrypted private-key custody + public key history
  checkpoints.json     # signed local checkpoint history
  qdag.json            # canonical content-addressed Q-DAG ledger
  .local-master-secret # development fallback only; never used in production
```

`qdag.json` is atomically persisted and verified before write. Restart rehydrates the DAG and preserves its Merkle root and node history.

When PostgreSQL is enabled, `witness_nodes`, `witness_keys`, and `witness_checkpoints` are projections. The local Q-DAG remains canonical. PostgreSQL is used as a recovery source only if the local Q-DAG is absent/empty.

## Persistent local identity

The Ed25519 identity is loaded from the encrypted local keystore. The file uses `scrypt` key derivation and AES-256-GCM authenticated encryption with fresh salt/IV per write and atomic replacement.

Production requires `WITNESS_KEY_PASSWORD`. Development may generate a random `.local-master-secret`, but this is not KMS/HSM-equivalent because encrypted material and the development secret live on the same host.

Private PEM material must never appear in Q-DAG, PostgreSQL projections, checkpoint files, API responses, logs, or source control.

## Key lifecycle

Keys use:

```text
ACTIVE
SUPERSEDED
REVOKED
```

Rotation supersedes the active key and creates a new one. Revocation persists across restart. If the only active key is revoked, the node remains able to read/verify history but cannot sign until an administrator explicitly creates a replacement.

## Mizan commitments

Persisted analysis/evaluation results are committed to Q-DAG using `MW-MIZAN-WITNESS-V1` nodes. `/api/v1/ai/analyze` commits only when the caller has `ANALYZE` permission; anonymous AI analysis remains non-ledger. They contain deterministic commitments for:

- input text;
- Mizan output;
- semantic output;
- lifecycle output;
- combined result + model version.

The raw text and full readable analysis remain in the primary application persistence and are not duplicated into Q-DAG.

Hash commitments improve integrity separation, but a plain hash is not anonymization, encryption, or a zero-knowledge proof. Low-entropy source values may still be guessable by an attacker with sufficient context.

## Checkpoints

The authority model is:

```text
1-of-1 local witness
```

By default, committed Mizan records trigger a signed local checkpoint. Disable this with:

```text
WITNESS_AUTO_CHECKPOINT=0
```

A signature proves possession of the corresponding local private key and binds the checkpoint to the Q-DAG state. It does not establish factual truth, divine judgment, or network consensus.

## Backup

Create a verified backup with:

```bash
npm run witness:backup
```

Backup directories contain encrypted custody/history files, Q-DAG data/snapshot, and a SHA-256 manifest. The manifest records expected root and node count.

The witness password and development `.local-master-secret` are deliberately excluded. Store recovery secrets separately from the backup itself.

## Recovery drill

Run:

```bash
npm run witness:recovery-drill
```

The drill is non-destructive. It restores the latest backup into a temporary directory, reopens the encrypted keystore, rebuilds the Q-DAG, compares the root, and verifies all checkpoint signatures.

A real restore should be performed while the API process is stopped. Runtime restore is intentionally not exposed as an HTTP endpoint.

## Diagnostics

Run locally:

```bash
npm run witness:diagnostics
```

or query:

```text
GET /api/v1/witness/diagnostics
```

States:

- `HEALTHY` — ledger/key/checkpoints valid and latest backup verifies;
- `DEGRADED` — integrity is intact but no active signing key or no verified backup exists;
- `FAILED` — Q-DAG, encrypted-keystore, or checkpoint integrity fails.

## Metrics

`GET /api/v1/witness/metrics` exposes runtime counters for witness operations. Metrics are operational telemetry; they reset with process lifetime and are not consensus or immutable-ledger data.

## Deferred

The following are explicitly outside the current baseline:

- peer discovery;
- gossip;
- federation;
- network quorum;
- consensus;
- automatic remote replication;
- post-quantum production signatures;
- ZK proof implementation.

## v4.20 semantic commitment note

The single-node witness mechanics are unchanged. New Mizan payloads can include the v4.20 Qur'anic epistemic status before being hashed into the existing privacy-preserving Mizan commitment. No new witness schema or multi-node behavior is introduced.

## v4.28 Moral lifecycle commitment

API Mizan commitments include the combined processing lifecycle and `moralLifecycle` inside the lifecycle hash input. This preserves hash-only provenance for restorative/relapse state without storing raw input text in Q-DAG.
