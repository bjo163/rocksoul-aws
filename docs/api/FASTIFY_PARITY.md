# Fastify Route Parity

Route parity tests verify that Fastify produces equivalent responses to the native HTTP runtime.

## Route coverage

| Method | Path | Status | Notes |
|--------|------|--------|-------|
| GET | `/api/v1/health` | parity | contract identical |
| GET | `/api/v1/ready` | parity | contract identical |
| GET | `/api/v1/features` | parity | |
| GET | `/api/v1/prophets` | parity | |
| POST | `/api/v1/auth/register` | parity | |
| POST | `/api/v1/auth/setup` | parity | |
| POST | `/api/v1/auth/login` | parity | |
| POST | `/api/v1/auth/refresh` | parity | |
| POST | `/api/v1/auth/provision` | parity | |
| POST | `/api/v1/auth/bind-rid` | parity | |
| POST | `/api/v1/auth/logout` | parity | |
| GET | `/api/v1/auth/me` | parity | |
| GET | `/api/v1/auth/online` | parity | |
| POST | `/api/v1/mizan` | parity | |
| GET | `/api/v1/kernel/graph` | parity | production audit-gated |
| GET | `/api/v1/kernel/graph/integrity` | parity | production audit-gated |
| GET | `/api/v1/kernel/ledger` | parity | production audit-gated |
| GET | `/api/v1/kernel/types` | parity | production audit-gated |
| GET | `/api/v1/models` | parity | production audit-gated |
| GET | `/api/v1/models/:typeId` | parity | production audit-gated |
| GET | `/api/v1/models/:typeId/page` | parity | production audit-gated |
| GET | `/api/v1/entities` | parity | legacy-only |
| GET | `/api/v1/entities/:id` | parity | legacy-only |
| GET | `/api/v1/entities/:id/graph` | parity | legacy-only |
| POST | `/api/v1/entities` | parity | legacy-only |
| PUT | `/api/v1/entities/:id` | parity | legacy-only |
| DELETE | `/api/v1/entities/:id` | parity | legacy-only |
| POST | `/api/v1/relations` | parity | legacy-only |
| POST | `/api/v1/events` | parity | legacy-only |
| POST | `/api/v1/types` | parity | legacy-only |
| POST | `/api/v1/rules/resolve` | parity | legacy-only |
| GET | `/api/v1/observability/recent` | parity | |
| GET | `/api/v1/stream` | parity | SSE |
| GET | `/api/v1/metrics` | parity | |
| GET | `/api/v1/semantic/registry` | parity | production audit-gated |
| GET | `/api/v1/revelation/*` | parity | |
| GET | `/api/v1/jobs/:id` | parity | |
| POST | `/api/v1/jobs/process` | parity | |
| POST | `/api/v1/observe` | parity | |
| POST | `/api/v1/analyze` | parity | |
| POST | `/api/v1/evaluate` | parity | |
| POST | `/api/v1/query` | parity | |
| GET | `/api/v1/xrp/workspace` | parity | |
| POST | `/api/v1/xrp/cases` | parity | |
| POST | `/api/v1/xrp/cases/:id/evidence` | parity | |
| POST | `/api/v1/xrp/work-items` | parity | |
| POST | `/api/v1/xrp/cases/:id/request-review` | parity | |
| GET | `/api/v1/flow/workflows` | parity | |
| POST | `/api/v1/flow/workflows` | parity | |
| POST | `/api/v1/flow/workflows/:id/request-review` | parity | |
| POST | `/api/v1/command` | parity | |
| GET | `/api/v1/resource/:id/audit` | parity | |
| GET | `/api/v1/resource/:id/replay` | parity | |
| GET | `/api/v1/resource/:id` | parity | |
| GET | `/api/v1/reviews` | parity | |
| POST | `/api/v1/reviews` | parity | |
| POST | `/api/v1/reviews/:id/transition` | parity | |
| GET | `/api/v1/resource/:id/evidence` | parity | |
| POST | `/api/v1/resource/:id/evidence` | parity | |
| POST | `/api/v1/ingress/reminder` | parity | |
| POST | `/api/v1/ingress/reminder/trigger` | parity | |
| POST | `/api/v1/ai/analyze` | parity | |
| GET | `/api/v1/witness/status` | parity | |
| GET | `/api/v1/witness/keys` | parity | admin-only |
| POST | `/api/v1/witness/keys/rotate` | parity | admin-only |
| POST | `/api/v1/witness/keys/revoke` | parity | admin-only |
| POST | `/api/v1/witness/keys/create` | parity | admin-only |
| POST | `/api/v1/witness/checkpoints` | parity | admin-only |
| GET | `/api/v1/witness/checkpoints` | parity | |
| GET | `/api/v1/witness/proof/:hash` | parity | |
| POST | `/api/v1/witness/export` | parity | |
| POST | `/api/v1/witness/import` | parity | |
| POST | `/api/v1/witness/import/async` | parity | |
| GET | `/api/v1/witness/metrics` | parity | |
| GET | `/api/v1/witness/diagnostics` | parity | |
| POST | `/api/v1/witness/backups` | parity | admin-only |
| GET | `/api/v1/witness/backups` | parity | |
| GET | `/api/v1/witness/backups/:backupId/verify` | parity | |

## Running parity tests

```text
npm run test:fastify-adapter
```

## Known differences

- Cookie handling uses Fastify's reply.cookies API instead of raw Set-Cookie headers.
- SSE uses reply.raw.write instead of reply.writeHead.
- Error payloads may include `message` and `stack` in non-production, matching native behavior.
