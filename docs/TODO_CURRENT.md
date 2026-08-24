# Cosmic — Active Engineering TODO

This is the **active** Todo for the current `dev` trunk. Historical audit details remain in `docs/TODO.md` and must not be treated as the current release status.

## Release train

`4.33.0 → 4.33.1 → 4.34.0 → 4.35.0 → 4.36.0 → 5.0.0`

`dev` is the development/integration trunk. Automatic CI is intentionally disabled on `dev`; certification runs on the release path to `main` or by manual dispatch using the self-hosted `cosmic` runner.

## P0 — 4.33.0 release blockers

- [ ] **#23 / #44 — 1006-case API certification:** resolve the remaining 32 failures; target **1006/1006 PASS**, no scope reduction.
- [ ] **#35 — Release gate:** PostgreSQL, typecheck, lint, builds, Docker, dependency integrity, OpenAPI, Coolify, release identity.
- [ ] **#45 — Release provenance:** SBOM, exact SHA, dependency graph, artifact checksums, container digest, certification evidence.
- [ ] **#46 — Schema/migrations:** authoritative schema inventory, drift detection, empty-db migration, upgrade path.
- [ ] **#62 — Persistence conformance:** file/PostgreSQL shared repository invariants, transactions, conflicts, jobs, traces, reopen/close.
- [ ] **#63 — Audit/event integrity:** deterministic replay, tamper/sequence-gap detection, export/import verification.

## P1 — 4.33.1 hardening

- [ ] **#59 — Auth/session:** refresh rotation, replay/revocation, restart, cookie/bearer parity, clock skew.
- [ ] **#37 — Production security:** issuer/audience, CORS, proxy trust, secure cookies, secret rotation.
- [ ] **#38 / #30 — PostgreSQL:** pool/timeouts, transaction retry, migration locking, backup/restore, PITR/recovery.
- [ ] **#47 — Witness durability:** restart, corrupt/truncated state, checkpoint verification, backup manifest.
- [ ] **#48 / #29 — Observability:** structured logs, metrics, DB/queue/Witness health, redaction, bounded cardinality.
- [ ] **#49 / #25 — DR:** backup/restore/rollback rehearsal and explicit RTO/RPO evidence.
- [ ] **#57 — Reproducibility:** clean-checkout bootstrap, environment preflight, fixture hygiene, troubleshooting matrix.

## P2 — 4.34.0 platform contract

- [ ] **#39 / #27 — OpenAPI:** complete public-route parity, request/response schemas, canonical errors, pagination/filter/sort.
- [ ] **#40 / #32 — SDK:** typed/generated client coverage, auth/RID propagation, retries only when safe, staging smoke.
- [ ] **#50 — API semantics:** finalize error/pagination/idempotency contract and version registry.
- [ ] **#51 / #67 — AI:** provider interface, limits, timeout/cancel/failure behavior, model metadata, evaluation fixtures.
- [ ] **#52 / #68 — Provenance:** evidence→analysis→review→Witness integrity and offline audit export/verify.
- [ ] **#58 / #63 — Event/audit:** stable versioned envelope, replay compatibility, tamper detection.
- [ ] **#64 — Authorization:** route matrix, role/RID parity, privilege-escalation regression tests.
- [ ] **#65 — Pagination:** bounded limits, stable ordering, malformed filter/sort cases.
- [ ] **#66 — Compatibility:** deprecation lifecycle, old-client fixtures, schema diff policy.

## P2 — 4.35.0 distributed execution

- [ ] **#41 / #31 — Worker:** standalone role, PostgreSQL claim/lease, retries/backoff/DLQ, graceful drain, health, Coolify worker.
- [ ] **#53 — Distributed consistency:** concurrent commands/reviews/Witness writes and deterministic conflict semantics.
- [ ] **#54 — Performance:** P50/P95/P99 baselines, sustained load, API/DB/Witness capacity thresholds.
- [ ] **#69 — Queue protocol:** QUEUED/RUNNING/COMPLETED/FAILED/DEAD, leases, retries, duplicate delivery, replay.

## P2 — 4.36.0 product surfaces

- [ ] **#42 / #24 — Coolify:** real staging deployment, domains, HTTPS smoke, persistent volumes, restart, backup/restore.
- [ ] **#55 / #33 — Web/CAB/XRP/Flow runtime:** centralized API base URL, no production localhost, error/offline states, session bootstrap.
- [ ] **#56 — Governance boundaries:** public Web/XRP vs private CAB/Flow, server-side authorization, browser smoke, accessibility/localization/theme.

## P3 — 5.0.0 platform freeze

- [ ] **#43 — Major release:** freeze API/SDK/events/jobs/schema compatibility, migration policy, threat model, dependency/security review, DR rehearsal, upgrade rehearsal, reproducible RC certification.

## Current implementation state

- ✅ SQLite is outside the supported runtime surface; supported persistence drivers are `memory`, `file`, and `postgres`.
- ✅ HTTP hardening contract coverage exists.
- ✅ API error/pagination/idempotency contracts exist.
- ✅ Authorization, AI governance, queue lifecycle, UI governance, runtime configuration, recovery, provenance, and release-evidence contract suites have been added.
- ✅ `dev` is development-only for automatic CI purposes; `main` is the certification/release path.
- 🟡 Contract-only work must still be converted into production runtime implementation where the corresponding issue requires it.
- 🔴 The 1006-case DDT root-cause work remains the primary 4.33.0 blocker.

## Rules

1. Do not delete or weaken certification coverage to obtain green results.
2. Every production bug gets a regression test.
3. API changes update schemas/contracts and compatibility tests.
4. Schema changes include migration and recovery consideration.
5. Security-sensitive production configuration fails closed.
6. Historical documents never override this active Todo or `docs/ENGINEERING_ROADMAP.md`.
7. `main` accepts only same-SHA certified release commits.
