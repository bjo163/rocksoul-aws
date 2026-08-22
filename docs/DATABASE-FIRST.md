# MoonWitness OS 4.9.0 — Database-First Runtime

MoonWitness production runtime now treats PostgreSQL as the single source of truth for seeded master-data and knowledge snapshots used by decision-support engines.

## Runtime flow

```text
seed files (version-controlled)
        |
        v
  npm run db:install
        |
        v
 PostgreSQL entities
        |
        v
 runtime-data catalog
        |
        +--> Semantic Engine
        +--> Justice/Fiscal/Governance engines
        +--> World/Asma/Prophetic/Geography engines
        +--> Backend rules + type catalog
        |
        v
 Mizan / lifecycle / audit
```

## Important rule

Seed JSON/JSONL files remain version-controlled migration inputs. In PostgreSQL mode, runtime engines do not silently fall back to those local files. Missing seeded runtime data produces `RUNTIME_DATA_NOT_SEEDED:<path>` or `RUNTIME_DATA_NOT_INITIALIZED:<path>`.

## Install

```bash
npm install
npm run db:install
```

The installer performs migration, idempotent seed, seed checksum/count verification, event/audit-chain verification, and a database-first runtime-data verification.

## Re-verify

```bash
npm run db:verify
npm run db:runtime-verify
```

`db:runtime-verify` confirms that all required runtime datasets can be reconstructed from PostgreSQL entities.

## Required runtime datasets

The canonical required list is exported by `src/persistence/runtime-data.ts`. It covers semantic aliases/registry, Asma, justice/fiscal/governance rules, backend rules/type catalog, Quran narrative patterns, and the Quran ayah corpus.

## Remaining local files

Local JSON is still appropriate for seed inputs, schemas/contracts, deployment configuration, and development fixtures. Runtime operational state such as authentication/idempotency has its own persistence path and is not part of this master-data runtime catalog yet.

## Operational state (4.10)
When `STORAGE_DRIVER=postgres`, authentication users, revoked-token hashes, and idempotency records are stored in PostgreSQL. File-backed auth/idempotency remains available only for non-Postgres development/test modes.

## 4.10.1 preflight boundary

PostgreSQL is the runtime source of truth for semantic/master datasets, cases/events/evidence/audit, auth users/revoked tokens, and idempotency. The legacy backend graph/ledger implementation still has local snapshot files (`backend-state.json`, `audit-ledger.json`, and type-registry persistence). This is intentionally reported by `npm run preflight` as `LEGACY_BACKEND_STILL_HAS_LOCAL_STATE_FILES` and must not be interpreted as PostgreSQL-backed until that subsystem is migrated.
