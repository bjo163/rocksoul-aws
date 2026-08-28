# Cosmic — Active Engineering TODO

Current branch model: `dev` is integration; `main` accepts only exact-SHA certified release commits.

## Repository scope

Cosmic is engine/API-first. Mandatory work in this repository covers packages, engine behavior, contracts, API/reference adapters, persistence, worker/jobs, Witness/audit/provenance, security, observability, and backend certification. Web/CAB/XRP/Flow product applications are outside this repository.

## Current P0 blockers

- [ ] **#94** — remove stale product-app dependency from mandatory release contracts. The old `apps/cab/src/lib/api.ts` dependency must not return; backend/API invariants must remain covered directly.
- [ ] **#23/#44** — complete API DDT root-cause work without reducing coverage.
- [ ] **#35** — obtain one exact-SHA full release certification through PostgreSQL, API build, final certification, and Docker.
- [ ] Keep PR `dev → main` aligned with actual implementation and exact-SHA evidence.

## Completed scope cleanup

- [x] Product UI delivery removed from Cosmic release scope.
- [x] #33, #42, #55, #56, and #72 closed/not-planned for Cosmic because they are product/UI concerns.
- [x] #78 release-identity stale CAB workspace dependency resolved.
- [x] README and package direction define Cosmic as engine/API-first.

## Execution order

### N0 — Repository truth and release hygiene
- [x] Align active docs with engine/API-only architecture.
- [x] Preserve full certification on `main` while validating `dev` pushes.
- [x] Add a release-scope guard against mandatory dependencies on removed product apps.
- [ ] Run fresh exact-SHA CI after this cleanup.

### N1 — Release contracts
- [ ] Finish #94 and verify release-focused tests no longer depend on removed product implementations.
- [ ] Preserve generic Entity/Relation/Event/Evidence/Case, resource, review, kernel, Witness, SDK, and OpenAPI coverage.
- [ ] Do not weaken tests merely to make CI green.

### N2 — API certification
- [ ] Reach the required full DDT pass with zero skipped/todo cases.
- [ ] Cluster failures by first causal error and fix the narrowest shared root cause.
- [ ] Add regression coverage for each production bug.

### N3 — Persistence and durability
- [ ] PostgreSQL empty-install migration certification.
- [ ] Schema drift and representative 4.x upgrade tests.
- [ ] File/PostgreSQL persistence conformance.
- [ ] Atomic mutation, idempotency, restart, replay, audit, and Witness durability checks.

### N4 — Platform/API hardening
- [ ] Complete OpenAPI route/schema parity and SDK compatibility.
- [ ] Freeze error, pagination, idempotency, authorization, event, job, and deprecation semantics.
- [ ] Complete worker lease/retry/DLQ and graceful drain behavior.
- [ ] Complete AI provider bounds/evaluation/provenance.

### N5 — Runtime and release operations
- [ ] Backend staging deployment with PostgreSQL readiness and HTTPS smoke.
- [ ] Security fail-closed configuration and secret/redaction verification.
- [ ] Backup/restore/rollback and disaster-recovery rehearsal.
- [ ] SBOM, artifact checksums, image digest, and exact-SHA evidence package.

### N6 — Fastify transition
- [ ] Continue #88–#93 independently from this cleanup.
- [ ] Preserve native API semantics until Fastify parity is independently demonstrated.
- [ ] Do not mix unrelated Fastify runtime edits into docs/release-scope work.

## Release train

`4.33.0 → 4.33.1 → 4.34.0 → 4.35.0 → 4.36.0 → 5.0.0`

## CI policy

- Push to `dev`: full self-hosted validation/certification feedback.
- Pull request targeting `main`: mandatory full certification.
- Push to `main`: retain full certification/release evidence.
- Manual dispatch: supported.
- Cancelled, queued, historical, partial, or different-SHA runs are not release evidence.

## Rules

1. Never restore product UI code just to satisfy a stale test or document.
2. Preserve the underlying backend/engine invariant when deleting a stale UI dependency.
3. Every production bug receives regression coverage.
4. API changes update contracts/OpenAPI/SDK compatibility where applicable.
5. Schema changes include migration and recovery consideration.
6. Production security fails closed.
7. Logical multi-write mutations must be transactional.
8. Historical documents never override this file or `ENGINEERING_ROADMAP.md`.
9. `main` accepts only the exact SHA that completed the required certification.
