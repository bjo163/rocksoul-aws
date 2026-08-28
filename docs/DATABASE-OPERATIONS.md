# MoonWitness OS — PostgreSQL Operations

## Install

```bash
npm install
npm run install:interactive
```

## Verify

```bash
npm run db:verify
npm run db:runtime-verify
npm run postgres:smoke
```

## Backup

With PostgreSQL:

```bash
STORAGE_DRIVER=postgres npm run db:backup -- --target=./data/backups/pre-test
```

This uses `pg_dump` custom format and creates `moonwitness.dump`.

## Restore

Only restore into a maintenance/test database. The PostgreSQL restore uses `pg_restore --clean --if-exists --no-owner --no-privileges`.

```bash
STORAGE_DRIVER=postgres npm run db:restore -- --source=./data/backups/pre-test/moonwitness.dump --allow-destructive
```

After restore, always run:

```bash
npm run db:verify
npm run db:runtime-verify
```

## Transaction and ledger integrity

PostgreSQL `batch()` binds repository operations to one dedicated connection through `AsyncLocalStorage`.
Event-ledger append uses a transaction advisory lock so concurrent writers serialize hash-chain construction. Audit-ledger writes are similarly serialized when executed outside an existing transaction.

## Important prerequisite

The PostgreSQL backup/restore commands require the PostgreSQL client utilities `pg_dump` and `pg_restore` to be installed and available on `PATH`.
