# PostgreSQL smoke test

After the interactive installer and API are running, the repository provides two smoke commands.

## Database-level

```bash
STORAGE_DRIVER=postgres npm run postgres:smoke
```

This verifies the schema version, seed coverage, duplicate IDs, core seed types, event-chain integrity, audit-chain integrity, and a write/read/event round trip.

## API-level

Start the API first, then:

```bash
SMOKE_API_URL=http://127.0.0.1:8787 \
SMOKE_ADMIN_USERNAME=admin \
SMOKE_ADMIN_PASSWORD='your-password' \
npm run api:smoke
```

The API smoke test verifies login, `/api/v1/health`, 10 natural-language `/analyze` cases, 10 matching `/ai/analyze` cases, `/evaluate`, and concurrent idempotent `/command` requests.

The smoke tests are deliberately read/write tests against the real PostgreSQL instance. Run them on a disposable test database or accept that they create `SMOKE-*` records.
