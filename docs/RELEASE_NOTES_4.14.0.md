# MoonWitness OS 4.14.0

## PostgreSQL single-source-of-truth hardening

- Added `PostgresBackendRuntime` for the legacy backend/kernel layer.
- PostgreSQL mode no longer reads or writes `backend-state.json`, `audit-ledger.json`, or `types.json` at runtime.
- Backend graph entities/resources/assets/types are persisted as PostgreSQL entities.
- Backend graph events are persisted in the shared PostgreSQL event ledger.
- Added one-time legacy migration: `npm run backend:postgres-migrate`.
- Added verification: `npm run backend:state-verify`.
- Interactive installer now offers legacy backend migration and verification.
- Preflight now verifies that PostgreSQL mode selects the PostgreSQL backend runtime.

## Compatibility

File-backed backend mode remains available for local development and tests.
