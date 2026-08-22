# Universe OS — Operations

## Install / seed

```bash
npm ci
npm run db:install
npm run validate
npm run certify:current
```

Seeding must be idempotent.

## Runtime

```bash
npm run api:dev
npm run web:dev
npm run cab:dev
```

`web:dev` starts the unauthenticated public/home site. `cab:dev` starts the authenticated Control & Audit Board. In development the CAB proxies `/api` to the API runtime; the public site is static and does not expose operational endpoints.

For production-like builds, install dependencies first, then use the workspace build commands. Revelation witness corpora are committed under `data/divine-books/witness-corpora/`; rebuild provenance with `npm run revelation:import-witnesses -- --source-file <verse-text-file>` when intentionally replacing the witness snapshot.

## Persistence

The system uses a persistence contract with repository/data-mapper access. The default portable development driver is file-based; additional database drivers implement the same contract.

### YAML Configuration

You can configure the persistence driver natively using `config/database.yaml`. The system reads the driver preference from this file (for example, setting `driver: sqlite`) before falling back to the `STORAGE_DRIVER` environment variable.

```yaml
version: 1
storage:
  driver: sqlite
  file_dir: ./data/runtime
```

## Worker

AI/indexing/heavy analysis may execute as persistent jobs. Jobs are expected to survive restarts and retain state transitions.

## Recovery

Case state is reconstructed from persistent records and/or event replay. Audit ledger verification should be part of recovery checks.

## File-store backup and restore

The portable file driver can be backed up with a checksum manifest and restored into a new directory:

```bash
npm run db:backup -- --source=./data/runtime --target=./data/backups/recovery-001
npm run db:restore -- --source=./data/backups/recovery-001 --target=./data/runtime-restored
```

Restore refuses corrupted backup files and refuses to overwrite an existing target file. After restore, run the persistence restart test or verify the event ledger and audit chain before putting the store back into service.

Schema migrations are applied transactionally by the SQLite and PostgreSQL providers. The current schema version is reported by `npm run db:status`.

Migration contract checks:

```bash
npm run persistence:migration:test
```

To enable a live database driver, install the optional peer dependency (`better-sqlite3` for SQLite or `pg` for PostgreSQL), configure `SQLITE_FILE` or PostgreSQL connection settings, then run `npm run db:install` and verify the resulting schema before seeding production data.


## Single-node witness operations (v4.20; v4.19 baseline retained)

Set a stable witness identifier and, in production, a strong externally managed keystore password:

```bash
export WITNESS_ID=SERVICE-WITNESS-001
export WITNESS_KEY_PASSWORD='<long-random-secret>'
```

The node stores its encrypted keystore and checkpoint history under `<MOONWITNESS_DATA_DIR>/witness/`. Back up these files together with the rest of the node state. Preserve the keystore password separately from the backup. A backup without the password cannot be decrypted; a password without the keystore cannot reconstruct the same private identity.

Development without `WITNESS_KEY_PASSWORD` uses `.local-master-secret` on the same machine. Do not copy this fallback pattern into production.

Before deployment run `npm run test:witness`. After restart verify `/api/v1/witness/status` reports the expected `witnessId`, `activeKeyId`, root, and `valid: true`. Key rotation/revocation are ADMIN-only operations. If the active key is revoked, the service remains capable of verification but signing/export is unavailable until `/api/v1/witness/keys/create` is called by an administrator.

No peer network is enabled in v4.20. Bundle endpoints are manual local utilities only.


### Witness completion runbook (retained in v4.20)

```bash
npm run witness:diagnostics
npm run witness:backup
npm run witness:recovery-drill
```

Recommended sequence before a production deployment or after key rotation: run diagnostics, create a fresh backup, then run the non-destructive recovery drill. Keep `WITNESS_KEY_PASSWORD` in a separate secret-management channel; it is intentionally absent from backup archives. Stop the API before performing any real restore. `WITNESS_AUTO_CHECKPOINT=0` may be used when explicit checkpoint cadence is preferred.


### File-mode concurrency hardening

The v4.19 baseline, retained in v4.20, serializes FileProvider initialization and atomic writes. File mode is therefore suitable for the one-node development/operational baseline without the previous shared-temp-file race. PostgreSQL remains the preferred external database when deployment requirements call for it.


## v4.21 Four-book Revelation Core

Normative reasoning is restricted to Al-Qur'an, Tawrat, Zabur, and Injil, with Al-Qur'an primary/Muhaimin. External research and historical metadata cannot contribute normative weight. The engine distinguishes scripture text from metadata and distinguishes a place mentioned in a passage from the place where that passage was revealed. Tawrat/Zabur/Injil transmitted textual-witness corpora are now bundled and seeded for corroboration only; they are not equated with the original revealed texts and cannot establish or reverse primary moral direction. See `REVELATION_SEMANTIC_CORE.md`.

## v4.22 Asma runtime operations

No Asma catalog seed step is required. Operators must seed/preserve the admitted revelation corpora and source-policy datasets. If a configured revelation corpus is absent, runtime must report it unavailable rather than substitute an external text. Asma/moral-graph inspection is deterministic over the same corpus snapshot.


## Revelation install/reconciliation — v4.24

Before deployment, run `npm run preflight`. During installation `db:install` verifies corpus checksums/counts, typed seed counts, runtime datasets, derived index fingerprints, and the ten-case Revelation smoke suite. Operators can rerun only the Revelation-specific gate with `npm run revelation:install-verify` after the database has been seeded. A mismatch is an installation failure; do not bypass it by editing expected counts in code—the canonical values live in `revelation-corpus-manifest.json`.

## v4.25 Revelation binding verification

After install, run `npm run revelation:install-verify`. Success requires all 18,328 typed passages, the current corpus fingerprint, all seven derived Revelation indexes including `REVELATION-INDEX::NATIVE-BINDING`, `REVELATION-INDEX::SCORING`, `REVELATION-INDEX::EVENT-INTERPRETER`, and `REVELATION-INDEX::MORAL-LIFECYCLE`, the current binding-profile SHA-256, and the canonical 10-case smoke matrix. An unresolved case is not an installation failure when `UNRESOLVED` is the expected safe result (currently smoking).

## v4.28 Install verification

`npm run revelation:install-verify` now verifies `REVELATION-INDEX::MORAL-LIFECYCLE` in addition to the prior six indexes and executes both the Revelation 10-case smoke matrix and Moral Lifecycle 10-case smoke matrix.

## v4.29 Install verification

`npm run revelation:install-verify` now verifies `REVELATION-INDEX::GRAMMAR` and the SHA-256 of `data/revelation/grammar-profile.json` in addition to the prior seven Revelation indexes.


## v4.30 install/operations note

Installation now builds and verifies nine Revelation derived indexes. `REVELATION-INDEX::DIVINE-ONTOLOGY` pins the corpus fingerprint plus the ontology-profile SHA-256. `revelation:install-verify` must fail if the ontology profile or index does not match the seeded runtime state.
