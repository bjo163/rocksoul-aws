# Backend PostgreSQL mode

MoonWitness PostgreSQL mode no longer uses `backend-state.json`, `audit-ledger.json`, or `types.json` as runtime persistence.

## Runtime

`apps/api/src/app.ts` passes the PostgreSQL persistence client into the legacy-bridge. The bridge selects `PostgresBackendRuntime` when the persistence driver is PostgreSQL.

The PostgreSQL backend runtime keeps a memory cache for synchronous graph reads, but PostgreSQL is the source of truth. Mutations are persisted through the shared persistence layer and reloaded from PostgreSQL on startup.

Persisted entity categories:

- `BACKEND.ENTITY`
- `BACKEND.RESOURCE`
- `BACKEND.ASSET`
- `BACKEND.TYPE`

Backend graph events are stored in the normal event ledger with `_backendGraph: true` in their payload.

## One-time migration

For an existing installation with legacy files under `MOONWITNESS_DATA_DIR`, run:

```bash
STORAGE_DRIVER=postgres npm run backend:postgres-migrate
npm run backend:state-verify
```

The migration accepts files either directly under `MOONWITNESS_DATA_DIR` or under `MOONWITNESS_DATA_DIR/legacy-backend`.

The interactive installer offers this migration automatically.

## Important

File-backed backend mode remains available for local development/testing. That mode is intentionally not database-first.
