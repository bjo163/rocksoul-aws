# Canonical Entity / Relation / Event / Evidence Boundary

## Purpose

This document freezes the generic persistence/API boundary used by Cosmic engines and host consumers. Product applications are consumers of this boundary; they do not define it.

## Canonical persistence contracts

```text
EntityRecord
RelationRecord
EventRecord
EvidenceRecord
Case aggregate / projections
```

Persistence remains generic. Revelation semantics, provenance, lanes, grounding, and relation meaning remain in their owning engine/package layers.

## Supported reference API surfaces

The reference API may expose generic surfaces such as:

- `/api/v1/entities`
- `/api/v1/entities/:id/graph`
- `/api/v1/resource/:id`
- `/api/v1/resource/:id/evidence`
- `/api/v1/resource/:id/audit`
- `/api/v1/reviews`
- `/api/v1/kernel/graph`
- `/api/v1/kernel/graph/integrity`
- `/api/v1/kernel/ledger`
- `/api/v1/witness/status`

## Duplicate-family rule

Do not introduce `/universe`, `/revelation-graph`, `/evidence-graph`, or another specialized graph family when generic Entity/Relation/Event/Evidence/Case contracts and existing query/graph/resource surfaces can express the same information.

## Compatibility guarantees

1. Generic persistence records remain stable enough for supported consumers.
2. Revelation/engine packages do not own HTTP transport clients.
3. Engine packages do not import product applications or concrete UI state.
4. API compatibility is tested directly against backend/reference API contracts.
5. PostgreSQL integration is authoritative only when the live certification lane passes.
6. No mandatory test proves an engine/API invariant by reading a removed product-app implementation file.
