# PostgreSQL Recovery & Upgrade Runbook

## Deployment model

Cosmic 4.33.0 uses PostgreSQL as the durable deployment backend. File persistence remains useful for local/single-node operation; memory is ephemeral. SQLite is not supported.

## Safe upgrade sequence

```text
backup
→ verify backup
→ deploy new image
→ run migrations
→ readiness check
→ smoke test
→ observe
```

Do not introduce destructive schema changes and application changes in the same release without an explicit migration/rollback strategy.

## Recovery sequence

Recovery and restore are **offline** operational procedures. There is **no remote destructive restore API**.

1. Stop application traffic or place the application into maintenance mode.
2. Preserve the current PostgreSQL state before attempting repair.
3. Restore into a disposable PostgreSQL instance first.
4. Run schema verification and persistence integrity checks.
5. Run Witness/Q-DAG diagnostics and audit-chain verification.
6. Rehearse the API smoke sequence against the restored instance.
7. Promote the recovered database only after verification succeeds.
8. Record the recovery event and release/commit identifiers.

The local restore command requires `--allow-destructive` for PostgreSQL. This
acknowledgement is deliberately required even when the source dump is valid;
use it only after selecting the isolated maintenance database in step 3.

## Coolify persistence

- PostgreSQL volume: `cosmic-postgres`.
- API runtime/Witness volume: `cosmic-api-data` mounted at `/data`.

Both stores must be included in the operational backup plan. A PostgreSQL backup alone does not replace the local Witness/Q-DAG backup requirement.

## Failure boundaries

Transient PostgreSQL failure must not silently become data loss. Application retries should be bounded and idempotent. Migration failure must fail deployment rather than leaving a partially initialized release serving traffic.
