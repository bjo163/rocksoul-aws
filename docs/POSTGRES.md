# MoonWitness OS — PostgreSQL Installation

PostgreSQL is the intended persistent backend for multi-user and production-style testing.

## 1. Interactive installer

For a guided setup, run:

```bash
npm install
npm run install:interactive
```

The wizard asks for PostgreSQL connection details, whether to seed the full corpus, whether to create an ADMIN user, and whether to save deployment settings to the gitignored `.env.local`. It then runs connectivity preflight, repository preflight, migration + seed, reconciliation, runtime-data verification, and optional admin bootstrap. No success message is printed if any verification step fails.

For CI or automation, use the existing non-interactive commands documented below.

## 2. Environment

Do not store database passwords in the repository. Set one of these configurations:

```text
STORAGE_DRIVER=postgres
PGHOST=localhost
PGPORT=5432
PGDATABASE=moonwitness
PGUSER=postgres
PGPASSWORD=your-password
```

`DATABASE_URL` may be used instead of the `PG*` variables.

## 3. One-command installation

From the repository root:

```bash
npm install
npm run db:install
```

`db:install` is the deployment entrypoint. It:

1. connects to PostgreSQL;
2. applies schema migrations in order;
3. acquires the PostgreSQL migration lock;
4. seeds the official manifest in `data/seed/manifest.json`;
5. also discovers any additional operational `*.json` / `*.jsonl` file under `data/` that is not yet in the manifest;
6. writes a `_seed` provenance block into every seeded entity containing source id, path, item index and SHA-256 of the seed file;
7. reopens PostgreSQL and performs a post-install verification;
8. reconstructs required runtime datasets from the seeded store;
9. builds seven derived Revelation indexes (Corpus, Asma, Moral Graph, Native Binding, Scoring, Event Interpreter, Moral Lifecycle) tied to the corpus fingerprint and verified profile SHA-256 values;
10. runs the canonical 10-case Revelation smoke test;
11. exits non-zero when any source count/checksum, index fingerprint, smoke test, audit chain, or event chain is invalid.

The installer defaults to PostgreSQL. You may override it explicitly for local persistence tests with `--driver=memory`, `--driver=file`, or `--driver=sqlite`.

## 4. What is seeded

`data/seed/manifest.json` is the canonical seed manifest. The current manifest contains:

- 102 explicit manifest sources;
- 18,566 seed entities expected by preflight;
- 18,328 typed Revelation passages;
- 6,236 Qur'an ayah entities;
- 5,852 Tawrat textual-witness passage entities;
- 2,461 Zabur textual-witness passage entities;
- 3,779 Injil textual-witness passage entities.

JSON schema files (`*.schema.json`) are intentionally excluded from runtime data seeding because they are source-code contracts, not database master data.

The raw files remain version-controlled as seed/migration sources. Production runtime is intended to read persisted state through repositories rather than treating local JSON as the live database.

## 5. Folder layout

```text
data/
├── seed/
│   └── manifest.json          # canonical seed source list
├── divine-books/
├── knowledge/
├── revelation/
├── semantic/
├── registries/
├── rules/
├── justice/
├── fiscal/
├── governance/
├── identity/
└── ...                        # domain-specific master data

packages/persistence/
├── src/
│   ├── bootstrap.ts           # idempotent seeding
│   ├── seed-catalog.ts        # SHA-256 seed metadata
│   └── seed-verification.ts   # post-install reconciliation
└── ...

scripts/
├── db-install.ts              # migrate + seed + verify
├── db-verify.ts               # verify existing PostgreSQL without reseeding
└── db-postgres-check.ts       # connectivity/repository smoke check
```

## 6. Verify without reseeding

```bash
SEED=0 npm run db:install
```

or:

```bash
npm run db:verify
```

`db:verify` checks every manifest/discovered source against the `_seed.sha256` values persisted in PostgreSQL, compares expected source-item counts with database entity counts, and verifies the event and audit hash chains.

## 7. Basic connectivity check

```bash
npm run db:check
```

This is a lightweight repository-access check. Use `db:verify` for the full reconciliation.

## Seed transaction note

Schema migrations are transactional and locked. Seed writes are intentionally sequential and idempotent rather than being wrapped in a false pool-level transaction: the current repository implementation uses the PostgreSQL pool directly for entity/audit writes. The installer therefore treats the post-seed reconciliation as the completion gate. A partial seed cannot be mistaken for a successful install because `db:install` exits non-zero until every source count/checksum and ledger verification passes.

## Witness projections — schema v5

Schema migration 5 creates `witness_nodes`, `witness_checkpoints`, and `witness_keys` with indexes on occurrence time, checkpoint root, and witness/status. On PostgreSQL startup the API may hydrate its local `WitnessDag` from `witness_nodes`; successful bundle imports project accepted nodes back into PostgreSQL. PostgreSQL is not used as the cryptographic source of node identity: hashes are recomputed by the Q-DAG verifier.

## Single-node witness note — retained in v4.20

No new PostgreSQL schema version is required in v4.20; the v4.19 single-node witness schema baseline remains sufficient. Schema v5 already contains the needed public witness projections. The encrypted private key is intentionally **not** stored in PostgreSQL. On startup, the canonical local Q-DAG is preferred. If it is empty/missing, PostgreSQL `witness_nodes` may seed recovery; afterwards local Q-DAG state is synchronized back as the projection. Public key lifecycle records and signed checkpoints are also projected. PostgreSQL loss therefore does not redefine cryptographic identity as long as the local keystore and its password are preserved.


## Revelation seed contract — v4.24

`data/divine-books/revelation-corpus-manifest.json` is the count/checksum authority for the four corpus files. Installer expected counts are read from this manifest rather than embedded in installer code. PostgreSQL runtime initialization reconstructs the structured JSONL arrays from database seed rows; the Revelation loader uses those seeded arrays when PostgreSQL runtime data is active.

Tawrat/Zabur/Injil are stored as textual-witness entities and cannot establish or reverse primary moral direction. This database representation does not change their source-class boundary.


## Revelation Event Interpreter — v4.27

The installer seeds `data/events/event-language-profile.json` as a non-normative runtime dataset and persists `REVELATION-INDEX::EVENT-INTERPRETER`. Its fingerprint is verified alongside Corpus, Asma, Moral Graph, Native Binding and Scoring. Event parsing is upstream structure only: it may identify negation, reporting, permission, mistake, coercion, sequence and restoration, but it cannot create moral direction or scripture authority.
