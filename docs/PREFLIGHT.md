# Preflight

Run before PostgreSQL installation:

```bash
npm install
npm run preflight
npm run final:certify
```

`preflight` validates seed manifest uniqueness, required runtime datasets, schema version, PostgreSQL auth/idempotency wiring, and production JWT requirements.

For PostgreSQL:

```bash
npm run db:check
npm run db:install
npm run db:verify
npm run db:runtime-verify
```

PostgreSQL idempotency uses a transaction-scoped advisory lock per key, so concurrent identical requests cannot both execute the protected work.

## Final pre-test commands

- `npm run preflight` — source/repository checks.
- `npm run db:verify` — seed reconciliation.
- `npm run db:runtime-verify` — runtime dataset verification.
- `npm run postgres:smoke` — real PostgreSQL persistence smoke test.
- `npm run api:smoke` — real HTTP/API smoke test, including 10 cases and idempotency concurrency.
