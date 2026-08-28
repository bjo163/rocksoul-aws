# Cosmic Universal API Contract

The canonical machine-readable API baseline is `docs/api/openapi.json`.

## Contract rules

- Public HTTP routes are versioned under `/api/v1`.
- New public response fields should be additive; breaking changes require a versioning decision.
- Authentication supports bearer and HTTP-only cookie transport where the route permits it.
- Error responses use an `error` code as the stable machine-readable field. Diagnostic `message` text is not guaranteed in production.
- Request/correlation IDs are operational metadata and must never contain credentials or secrets.
- RID assignment remains a trusted provisioning/admin operation; public registration cannot assign a RID.
- Targeted test subsets are debugging tools only. Full certification continues to run the complete API data-driven matrix.

## Route inventory and deprecation

`docs/api/openapi.json` inventories every route operation declared by the native
reference host. The automated parity harness fails when a native route is added,
removed, or renamed without the corresponding OpenAPI operation.

Routes labelled `x-contract-status: compatibility` are retained only for
existing reference-host consumers. They are marked `deprecated` with an explicit
replacement and sunset rule; new engine integrations should use the supported
workflow endpoints instead. A compatibility route cannot silently disappear in
the active API major version.

## List-query safety

Endpoints that expose list/query pagination accept only safe decimal integers:
`limit` is 1–250 and `offset` is 0–1,000,000. Filters are trimmed, capped at
512 characters (128 for type/state and 256 for entity identifiers), and reject
control characters. Sorting is not currently a supported contract; `sort` and
`order` fail closed rather than being silently ignored.

`POST /api/v1/query` additionally supports opt-in keyset pagination. Supply
`"cursor": null` for the first page, then return the opaque
`page.nextCursor` from the previous response as `"cursor"`. Cursor pages are
ordered by immutable `entityId` ascending and return `page.limit`,
`page.cursor`, and `page.nextCursor` (`null` at the terminal page). A cursor
cannot be combined with `offset`; legacy offset callers retain their existing
result shape and source ordering.

## Current persistence surface

- `memory`: ephemeral development/test state.
- `file`: portable local/single-node persistence.
- `postgres`: durable staging/production persistence.

SQLite is not a supported API or deployment backend.

## Staging smoke sequence

```text
GET /api/v1/ready
→ POST /api/v1/auth/login
→ GET /api/v1/auth/me
→ POST /api/v1/ai/analyze
→ POST /api/v1/command
→ GET /api/v1/health
```

The exact credentials and RID values must come from the staging environment, never from the repository.
