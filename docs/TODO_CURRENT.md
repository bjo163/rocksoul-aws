# Cosmic — Active Engineering TODO

This is the active Todo for the current `dev` trunk. Historical audit details remain in `docs/TODO.md`.

## Current blocker
- 4.33.0 remains blocked by the remaining 32 API/DDT failures from the last verified certification run.
- DDT diagnostics now support targeted TC ranges and failure clustering.
- The default DDT lane now uses a test-only high rate-limit ceiling so business/engine certification is not contaminated by production abuse thresholds; rate-limit behavior remains a separate security contract.
- Next verification step: run the targeted diagnostic around the suspected Engine Mode failure range, then re-run the full 999 generated cases plus the 7 focused API/E2E cases for the 1006 total.

## Release train
`4.33.0 → 4.33.1 → 4.34.0 → 4.35.0 → 4.36.0 → 5.0.0`

`dev` is development/integration. Automatic CI is intentionally disabled on `dev`; certification runs on PRs to `main`, pushes to `main`, or manual dispatch using self-hosted `cosmic`.

## P0 — 4.33.0
- [ ] #23/#44 — fix 32 DDT root causes; target 1006/1006 PASS with no coverage reduction.
- [ ] #35 — final release gate: PostgreSQL, typecheck, lint, builds, Docker, dependency, OpenAPI, Coolify, release identity.
- [ ] #45 — SBOM/provenance/artifact integrity.
- [ ] #46 — PostgreSQL schema/migration inventory and drift detection.
- [ ] #62 — File/PostgreSQL persistence conformance.
- [ ] #63 — audit/event replay, tamper, sequence-gap, export verification.

## P1 — 4.33.1
- [ ] #59 — auth/session replay, rotation, revocation, restart, clock-skew.
- [ ] #37 — production fail-closed security configuration.
- [ ] #38/#30 — PostgreSQL resilience, backup/restore, rollback, PITR/recovery.
- [ ] #47 — Witness restart/checkpoint/backup/integrity certification.
- [ ] #48/#29 — structured logs, metrics, redaction, DB/queue/Witness diagnostics.
- [ ] #49/#25 — DR and rollback rehearsal.
- [ ] #57 — reproducible development environment.

## P2 — 4.34.0
- [ ] #39/#27 — complete OpenAPI route parity and schemas.
- [ ] #40/#32 — generated SDK and staging compatibility.
- [ ] #50 — finalize API error/pagination/idempotency semantics.
- [ ] #51/#67 — AI provider limits, timeout/cancel/failure behavior, evaluation fixtures.
- [ ] #52/#68 — provenance graph and offline audit package.
- [ ] #58/#63 — versioned event/audit protocol and replay compatibility.
- [ ] #64 — authorization matrix parity.
- [ ] #65 — pagination/filter/sort correctness and bounds.
- [ ] #66 — backward compatibility/deprecation harness.

## P2 — 4.35.0
- [ ] #41/#31 — standalone worker, PostgreSQL claim/lease, retries/DLQ, graceful drain, Coolify worker.
- [ ] #53 — distributed consistency/concurrency.
- [ ] #54 — performance/capacity baseline.
- [ ] #69 — deterministic queue retry/lease/dead-letter protocol.

## P2 — 4.36.0
- [ ] #42/#24 — actual Coolify staging deployment, HTTPS smoke, restart and persistence verification.
- [ ] #55/#33 — Web/CAB/XRP/Flow runtime API configuration and resilience.
- [ ] #56 — governance-boundary/browser/accessibility/localization certification.

## P3 — 5.0.0
- [ ] #43 — platform contract freeze, compatibility/deprecation, schema/event/job policy, threat model, security review, DR rehearsal, upgrade rehearsal, reproducible RC certification.

## Implemented / contract-covered
- ✅ SQLite outside the supported runtime surface; supported drivers are `memory`, `file`, and `postgres`.
- ✅ HTTP security baseline and contract coverage.
- ✅ API error/pagination/idempotency contracts.
- ✅ Authorization, AI governance, queue lifecycle, UI governance, and runtime API configuration contracts.
- ✅ Witness/recovery, release-evidence, runtime worker/rate-limit, and OpenAPI baseline contracts.
- ✅ Targeted DDT diagnostic runner with `DDT_FROM` / `DDT_TO` filtering and status/body failure clustering.
- ✅ DDT test-only rate-limit isolation; production abuse limits remain covered separately.
- ✅ `dev` is not an automatic CI trigger; `main` is the certification/release path.

## Rules
1. Do not delete or weaken certification coverage to obtain green results.
2. Every production bug gets a regression test.
3. API changes update schemas/contracts and compatibility tests.
4. Schema changes include migration/recovery consideration.
5. Production security fails closed.
6. Historical documents never override this active Todo or `docs/ENGINEERING_ROADMAP.md`.
7. `main` accepts only same-SHA certified release commits.
