# MoonWitness OS — Interactive Installation

## Start

```bash
npm install
npm run install:interactive
```

The wizard is PostgreSQL-first. The seed prompt is generated from `revelation-corpus-manifest.json`; it no longer contains the obsolete hardcoded `6,564 entities expected` message.

With the current corpus the installer verifies and seeds **18,328 Revelation passages** before declaring the Revelation runtime ready.

## Installation pipeline

```text
CONNECTIVITY
→ REPOSITORY PREFLIGHT
→ CORPUS COUNT/SHA VERIFICATION
→ MIGRATION
→ FULL SEED
→ TYPED FOUR-BOOK RECONCILIATION
→ SEEDED RUNTIME INITIALIZATION
→ ASMA / MORAL / NATIVE-BINDING / SCORING / EVENT-INTERPRETER DERIVED INDEX BUILD
→ 10-CASE REVELATION SMOKE
→ EVENT PROFILE FINGERPRINT VERIFICATION
→ FULL DB RECONCILIATION
→ RUNTIME-DATA VERIFICATION
→ BACKEND STATE VERIFICATION
→ OPTIONAL ADMIN BOOTSTRAP
```

The wizard stops on any failed stage.

## Safety behavior

- database/admin secrets are read without echo on interactive TTYs;
- `.env.local` is gitignored and written with restrictive permissions where supported;
- Tawrat/Zabur/Injil are seeded as textual witnesses, never silently promoted to original revelation;
- checksums/counts are manifest-driven;
- a failed smoke test or derived-index fingerprint prevents a success state.

## Non-interactive PostgreSQL install

```bash
STORAGE_DRIVER=postgres \
PGHOST=localhost PGPORT=5432 \
PGDATABASE=moonwitness PGUSER=postgres PGPASSWORD='...' \
JWT_SECRET='...' \
npm run db:install
```

Verification commands:

```bash
npm run db:verify
npm run db:runtime-verify
npm run revelation:install-verify
```

## v4.28 Derived index build

The install pipeline now builds `CORPUS`, `ASMA`, `MORAL-GRAPH`, `NATIVE-BINDING`, `SCORING`, `EVENT-INTERPRETER`, and `MORAL-LIFECYCLE`, followed by Revelation and lifecycle smoke tests.

## v4.29 Derived index build

The install pipeline builds nine Revelation indexes: `CORPUS`, `ASMA`, `MORAL-GRAPH`, `NATIVE-BINDING`, `SCORING`, `EVENT-INTERPRETER`, `MORAL-LIFECYCLE`, `GRAMMAR`, and `DIVINE-ONTOLOGY`, then runs Revelation/lifecycle smoke verification.
