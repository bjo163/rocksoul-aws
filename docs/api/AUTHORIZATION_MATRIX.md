# API authorization matrix

This is the release contract for the native `/api/v1` engine API. The route
inventory test fails when a newly declared route is not either explicitly
public or guarded by `requireAuthenticated`/`requirePermission`.

## Public operations

Health/readiness and static discovery (`/health`, `/ready`, `/features`,
`/prophets`), authentication bootstrap (`register`, `setup`, `login`,
`refresh`), and the read-only revelation snapshots are public. Health returns
only its minimal status envelope to anonymous production callers.

## Authenticated and permissioned operations

All remaining routes require an active bearer or cookie session. Durable reads
and audit/proof exports use `READ_AUDIT`; observation and analysis use
`OBSERVE`/`ANALYZE`; evaluation and review workflows use `EVALUATE`; commands,
imports, and worker processing use `COMMAND`; key rotation, provisioning,
backups, metrics, and administrative auth use `ADMIN`.

Compatibility graph/entity routes are disabled in production unless
`MOONWITNESS_LEGACY_API=enabled`, and still require the corresponding audit or
command permission when enabled.

Role capabilities are tested in `tests/authorization-matrix-contract.test.ts`.
The native route guard boundary is tested in
`tests/api-route-inventory.test.ts` and runs as part of `test:api-route-inventory`
and `test:release`.
