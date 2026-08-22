# MoonWitness OS 4.13.0

## Focus
PostgreSQL transaction integrity and operational backup/restore.

## Changes
- PostgreSQL repositories now participate in `store.batch()` transactions through an async transaction context.
- `begin()` no longer exposes an unsafe connection-less transaction state; use `batch()`.
- Event-ledger writes are serialized with a PostgreSQL transaction advisory lock to protect the hash chain under concurrent writes.
- Audit-ledger standalone writes are serialized through the same transaction mechanism.
- Fixed the audit writer so it uses its supplied PostgreSQL query handle rather than an invalid class context.
- `db:backup` uses `pg_dump` for PostgreSQL deployments and keeps the file-store backup path for non-PostgreSQL modes.
- `db:restore` uses `pg_restore` for PostgreSQL deployments and keeps the file-store restore path for non-PostgreSQL modes.
- Added database operations documentation and release notes.

## Verification status

Repository-level checks pass where dependencies are available. A live PostgreSQL server is still required for `postgres:smoke`, backup, restore, and end-to-end API certification.
