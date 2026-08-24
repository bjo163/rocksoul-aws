# Canonical Entity / Relation / Event / Evidence Boundary

## Purpose

This document freezes the K2–K5 boundary for Revelation and CAB. Revelation and CAB are projections over the existing persistence contracts; they do not introduce a parallel semantic API family.

## Canonical persistence contracts

The persistence layer owns the generic records:

```text
EntityRecord    { id, type, payload, audit/version }
RelationRecord  { id, fromId, type, toId, payload, validity }
EventRecord     { eventId, entityId, eventType, payload, occurrence/recording, hash }
EvidenceRecord  { evidenceId, entityId, sourceType, reference, status, confidence, payload }
```

The repository interfaces are likewise canonical:

```text
EntityRepository
RelationRepository
EventStore
EvidenceRepository
AuditStore
ProjectionStore
```

## Revelation mapping

```text
BOOK                  → EntityRecord.type
SURAH                 → EntityRecord.type
PASSAGE               → EntityRecord.type
PROPHET_REFERENCE     → EntityRecord.type
PROPHETIC_EVENT       → EntityRecord.type

Revelation relation   → RelationRecord
Prophetic lifecycle   → EventRecord
Scriptural/supporting evidence → EvidenceRecord
```

Semantic lane (`CORE`, `DERIVED`, `UNRESOLVED`), grounding, provenance, and relation meaning remain in the Revelation package. Persistence remains generic.

## CAB mapping

CAB reads the same records and projects them into the Universe read model:

```text
Entity / Relation / Event / Evidence / Case
                ↓
       Revelation semantic graph
                ↓
        CAB Universe projection
```

CAB must not maintain a second graph database, second Evidence model, or Prophet-specific persistence contract.

## Existing API surface retained

CAB may use the existing surfaces for:

- `/api/v1/entities`
- `/api/v1/entities/:id/graph`
- `/api/v1/resource/:id`
- `/api/v1/resource/:id/evidence`
- `/api/v1/resource/:id/audit`
- `/api/v1/reviews`
- `/api/v1/kernel/graph`
- `/api/v1/kernel/integrity`
- `/api/v1/kernel/ledger`
- `/api/v1/witness/status`
- `/api/v1/prophets`

No `/universe`, `/revelation-graph`, `/evidence-graph`, `/prophet/:id/events`, or other specialized API family is required for the CAB projection.

## K3 duplicate-family rule

A proposed specialized endpoint is rejected when the same information can be represented through the generic Entity / Relation / Event / Evidence / Case contracts and existing query/graph/resource surfaces.

## K4 runtime validation

The runtime boundary is validated through the existing CAB contracts and PostgreSQL certification lane. Empty and unresolved states are valid states and must not be replaced by fabricated positive evidence.

## K5 compatibility guarantees

Compatibility tests must verify:

1. Existing Entity / Relation / Event / Evidence routes remain referenced by CAB.
2. Revelation package code does not create direct HTTP clients.
3. CAB does not import persistence internals into semantic UI components.
4. No specialized Universe/Revelation/Evidence graph API is introduced.
5. Existing PostgreSQL integration remains authoritative for persistence behavior.
