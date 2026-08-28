# Cosmic Engineering Roadmap — 4.33.x → 5.0.0

`dev` is the integration trunk. `main` receives only certified release commits (each backed by exact-SHA evidence).

## Architectural direction

```text
contracts
   ↓
temporal / TSE → semantic → Mizan → explanation
   ↓
cosmic-engine
   ↓
orchestrator
   ↓
host adapters: API / persistence / Witness / jobs / auth
```

Product Web/CAB/XRP/Flow applications live outside Cosmic and consume these contracts. Web, XRP, CAB, and Flow production integration is certified in their owning repositories.

## 4.33.0 — Certification baseline

Exit only when one SHA passes dependency integrity/audit, documentation and architecture checks, package/runtime contracts, lint, typecheck, release identity, release-focused tests, PostgreSQL certification, API build, final certification, and Docker build.

Primary release goal: remove stale product-app assumptions from certification without reducing backend coverage.

## 4.33.1 — Reliability and security

Auth/session lifecycle, fail-closed HTTP configuration, PostgreSQL resilience, Witness durability, structured observability, backup/restore/rollback, deterministic CI diagnostics, and atomic compatibility mutations.

## 4.34.0 — Platform contracts

OpenAPI completeness, SDK compatibility, canonical errors/pagination/idempotency, authorization matrix, API deprecation policy, AI provider/evaluation contract, AI provider/evaluation boundaries, provenance/evidence integrity, and event/audit compatibility.

Fastify transition work is tracked independently and must preserve native API semantics until parity is certified.

## 4.35.0 — Distributed execution

Standalone worker, PostgreSQL claim/lease semantics, queue leases/retries/dead-letter semantics, retries/dead-letter behavior, graceful drain, concurrency consistency, and capacity/performance baselines.

## 4.36.0 — Engine intelligence and integration hardening

Strengthen TSE → semantic → evidence → Mizan → explanation composition, provenance, deterministic replay, host-neutral orchestration, package public APIs, and reference-host integration. No browser/product UI deliverable is required in Cosmic.

## 5.0.0 — Major contract freeze

Freeze supported package/API/SDK/event/job contracts, schema migration/rollback policy, deployment topology, threat model, threat-model review, disaster recovery rehearsal, DR/upgrade rehearsal, compatibility guarantees, and reproducible release provenance. Deployment must be reproducible from a clean checkout.

## Engineering rules

1. Never reduce certification coverage to obtain green CI.
2. Every bug fix adds or strengthens a regression test.
3. API changes update contract and compatibility evidence.
4. Schema changes include migration and recovery consideration.
5. Production security configuration fails closed.
6. Multi-write logical mutations are transactional.
7. Engine packages remain HTTP/UI/storage implementation agnostic.
8. Historical UI-era documents and tests cannot define current release scope.
