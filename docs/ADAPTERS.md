# Adapters

Applications construct infrastructure and translate transport commands. The API owns HTTP/Fastify, authentication, validation, serialization, persistence composition, and witness wiring. Engine packages remain host-neutral. Persistence exposes ports while file/Postgres implementations live below the persistence boundary. CLI and workers should consume `@moonwitness/intelligence` and the same capability/workflow packages as the API.

The current API route tree is still a compatibility adapter and is being split incrementally under the route-inventory tests; no engine package imports it.

## Route composition boundary

The active composition in `apps/api/src/routes/index.ts` mounts five extracted
capability modules:

- `analysis.routes.ts` — `POST /api/v1/analyze`
- `observation.routes.ts` — `POST /api/v1/observe`
- `evaluation.routes.ts` — `POST /api/v1/evaluate`
- `evidence.routes.ts` — `POST /api/v1/resource/:id/evidence`
- `review.routes.ts` — `POST /api/v1/reviews`

`legacyV1Router` remains mounted as the compatibility boundary for the 33
operations still declared in `apps/api/src/routes/v1.routes.ts`. The deferred
capability families are observability, semantic, revelation, jobs, and
workflow/flow. The remainder includes query, XRP, command, resource/review
inspection, ingress, and `POST /api/v1/ai/analyze` routes. This is an HTTP
adapter migration boundary only; it does not move or duplicate route behavior.

`tests/api-route-inventory.test.ts` keeps both sides exact: adding or removing
a route requires an explicit ownership update, while
`tests/api-contract-parity.test.ts` continues to require OpenAPI parity for
the complete native route surface.
