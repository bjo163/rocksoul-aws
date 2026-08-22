# API / Entity Boundary Audit

## K1 — Existing Capability Inventory

This audit records the existing API surface before any proposal for new Universe endpoints.

### Authentication
- `GET /api/v1/health`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`
- `POST /api/v1/auth/refresh`
- `GET /api/v1/auth/online`
- `POST /api/v1/auth/provision`
- `POST /api/v1/auth/bind-rid`

### Entity / Graph
- `GET /api/v1/models`
- `GET /api/v1/models/:typeId`
- `GET /api/v1/entities`
- `POST /api/v1/entities`
- `PUT /api/v1/entities/:id`
- `DELETE /api/v1/entities/:id`
- `GET /api/v1/entities/:id/graph`

### Universe analysis / queries
- `POST /api/v1/observe`
- `POST /api/v1/analyze`
- `POST /api/v1/evaluate`
- `POST /api/v1/query`
- `POST /api/v1/command`
- `GET /api/v1/resource/:id`
- `GET /api/v1/resource/:id/evidence`
- `POST /api/v1/resource/:id/evidence`
- `GET /api/v1/resource/:id/audit`
- `GET /api/v1/resource/:id/replay`

### Review / Witness / Kernel
- `GET /api/v1/reviews`
- `POST /api/v1/reviews`
- `POST /api/v1/reviews/:id/transition`
- `GET /api/v1/kernel/graph`
- `GET /api/v1/kernel/graph/integrity`
- `GET /api/v1/kernel/ledger`
- `GET /api/v1/witness/status`

### Existing domain read
- `GET /api/v1/prophets`

## K1 conclusion

The current Entity / Relation / Event / Evidence / Case capabilities are sufficient to express the CAB Universe projection. No separate `/universe`, `/revelation-graph`, `/evidence-graph`, or Prophet-specific write API is required for the current roadmap.

K2 will map the Revelation graph's canonical node/relation shapes onto these existing Entity / Relation contracts. K3 will identify any genuinely redundant specialized endpoint before implementation.
