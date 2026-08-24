# Cosmic Engineering Roadmap — 4.33.x → 5.0.0

`dev` is the integration trunk. `main` receives only certified release commits.

**Active Todo:** `docs/TODO_CURRENT.md`  
**Historical audit:** `docs/TODO.md`

## 4.33.0 — Certification / Baseline

Exit only when the same `dev` commit passes:
- full API certification: 1006/1006 PASS
- PostgreSQL certification
- typecheck, lint, all workspace builds
- dependency integrity/audit
- SQL/persistence boundary tests
- release identity
- Docker build
- OpenAPI contract gate
- Coolify deployment validation

SQLite is intentionally outside the 4.33.0 supported runtime surface.

## 4.33.1 — Hardening / Reliability

Auth/session lifecycle, HTTP boundary, rate limiting, PostgreSQL resilience, Witness durability, structured observability, backup/restore/rollback, developer reproducibility, and CI diagnostics.

Current source already contains several HTTP hardening controls: bounded JSON body parsing, request/header/keep-alive timeouts, security headers, explicit CORS behavior, request IDs, rate-limit headers, bounded local rate-limit buckets, `Retry-After`, and production disclosure guards. Remaining work is contract coverage and production-matrix validation, not re-implementing existing controls.

## 4.34.0 — Platform API / Data / AI Contracts

OpenAPI completeness, canonical error/pagination/idempotency semantics, authorization matrix, SDK compatibility, API deprecation policy, AI provider/evaluation contract, provenance/evidence integrity, event/audit protocol, and external audit package.

## 4.35.0 — Distributed Execution / Scale

Standalone worker, queue leases/retries/dead-letter semantics, concurrency and distributed consistency, capacity benchmarks, and safe scale-out.

## 4.36.0 — Product Surfaces

Web, XRP, CAB, and Flow production integration, centralized runtime API configuration, browser/API smoke tests, offline/error states, and governance-boundary certification.

## 5.0.0 — Platform Major

Freeze the public contract, document compatibility/deprecation guarantees, finalize persistence and event/job protocols, complete threat-model review, disaster recovery rehearsal, upgrade testing, and reproducible release provenance.

## Engineering rules

1. Never reduce certification coverage to obtain a green build.
2. Every bug fix adds or strengthens a regression test.
3. API changes update the contract and compatibility tests.
4. Schema changes include migration and recovery consideration.
5. Production security configuration fails closed.
6. Deployment must be reproducible from a clean checkout.
7. Evidence, review, audit, and Witness semantics remain traceable and deterministic.
8. Historical documentation never overrides the active release contract.
