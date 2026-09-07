# Cosmic Engine — Canonical Architecture

## Purpose

Cosmic is an engine/API-first research runtime for deterministic temporal astronomy, semantic event interpretation, evidence-aware Mizan analysis, bounded explanation, orchestration, and auditable host integration.

## Dependency direction

```text
@moonwitness/contracts
        ↓
temporal / TSE / semantic / Revelation / Mizan / explanation engines
        ↓
@moonwitness/cosmic-engine
        ↓
@moonwitness/orchestrator
        ↓
host adapters
  ├─ API / SDK
  ├─ persistence
  ├─ auth / authorization
  ├─ jobs / worker
  ├─ Witness / audit
  └─ observability / deployment
```

Dependencies move downward only. Engine packages must not import HTTP frameworks, UI packages, concrete databases, auth implementations, or product applications.

## Repository applications

`apps/api` is the only application workspace in Cosmic. It is a reference/compatibility host adapter. Product Web, CAB, XRP, and Flow applications are not repository applications and do not participate in Cosmic release certification.

## Package responsibilities

- `contracts`: public DTO/protocol/port contracts.
- `tse-engine` / `temporal-engine`: deterministic temporal facts and temporal research signals.
- `semantic-engine`: non-transport semantic interpretation.
- `revelation`: canonical corpus/knowledge boundary and provenance-aware semantic structures.
- `mizan-engine`: bounded analytical projection.
- `explanation-engine`: bounded explanation over structured analysis.
- `cosmic-engine`: host-neutral facade.
- `orchestrator`: reusable workflows over injected ports.
- `persistence` / `data-access`: storage repositories/adapters.
- `jobs`: asynchronous execution semantics.
- `witness`: integrity, Q-DAG/checkpoint, and related provenance commitments.
- `sdk`: consumer-facing API client contract.

## Host adapter boundary

The HTTP adapter owns parsing, authentication, authorization, idempotency keys, transport errors/status mapping, request limits, and lifecycle concerns. It must not own engine analysis, evidence composition, aggregate construction, Mizan reasoning, or Witness workflow logic.

Persistence adapters own SQL and database-specific behavior. Engine and application/domain logic must not issue SQL directly.

## Canonical analysis flow

```text
INPUT / OBSERVATION
      ↓
TEMPORAL / TSE
      ↓
SEMANTIC / EVENT
      ↓
EVIDENCE / PROVENANCE / REVELATION
      ↓
MIZAN
      ↓
BOUNDED EXPLANATION
      ↓
ORCHESTRATOR
      ↓
PERSIST / EVENT / JOB
      ↓
WITNESS / AUDIT
      ↓
REPLAY / VERIFY
```

## Persistence

PostgreSQL is the production/integration persistence target. File persistence is the portable standalone mode. Memory is for ephemeral tests/development. SQLite is outside the supported current runtime surface.

Logical multi-write operations must use a transaction/batch boundary. A failed second write must not leave a successfully committed first write when both represent one logical mutation.

## Epistemic boundary

`CORE`, `DERIVED`, and `UNRESOLVED` remain distinct. Revelation provenance, corroboration, observation, inference, AI output, Review, Witness, and Audit are separate semantic/governance layers. A Witness commitment proves integrity/ordering of the committed record, not factual truth or Divine acceptance.

## Compatibility

Legacy API/domain compatibility surfaces may remain while consumers migrate, but they are adapters rather than engine ownership. Specialized duplicate graph APIs are rejected when generic Entity/Relation/Event/Evidence/Case contracts can express the information.

## Product boundary

Product repositories may implement Web, CAB, XRP, Flow, visual systems, browser state, accessibility/localization, and hosting. They consume Cosmic package/API/SDK contracts. Cosmic does not restore product UI code to satisfy stale tests or documents.
# Target architecture

```text
contracts/kernel -> capability packages -> workflow -> orchestrator
       capability packages + workflow -> intelligence -> API / CLI / worker adapters
       persistence, jobs, observability, security --------------------------^ (injected)
```

The intelligence runtime is host-neutral: applications create a context, register capabilities and bundles, and invoke operations directly. Business orchestration is explicit and is not part of generic workflow infrastructure.
