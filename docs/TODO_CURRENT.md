# Cosmic — Active Engineering TODO

This is the active Todo for the current `dev` trunk. Historical audit details remain in `docs/TODO.md`.

## Current blocker
- 4.33.0 remains blocked by full release certification.
- Latest verified release-focused run #662 passed dependency integrity/audit, docs, architecture, lint, typecheck, release identity, and the broad release-contract suites.
- Run #662 then failed only at `tests/migration-rollback-contract.test.js` because `docs/operations/POSTGRES_RECOVERY.md` lacked explicit `offline` and `destructive restore` wording.
- That documentation contract mismatch is fixed in commit `64e9d461b053ddbd06364cd72a32ead747a082bf`.
- Fresh certification is required; PostgreSQL/build/final/Docker gates remain unevaluated until release tests pass.
- Run #658 was cancelled and provides no certification evidence.
- DDT diagnostics support targeted TC ranges and failure clustering.

## NEXT EXECUTION PLAN — do these in order

### N0 — Re-certify current head
- [ ] Obtain fresh PR-to-main self-hosted certification for the recovery-runbook fix.
- [ ] Require architecture, lint, typecheck, release identity, release-focused tests, PostgreSQL, all builds, final certification, and Docker to pass on the same SHA.
- [ ] Treat cancelled/interrupted runs as no evidence.

### N1 — If release-focused tests fail again
- [ ] Capture exact failing contract and first causal error.
- [ ] Classify runner/build-sandbox vs source/runtime behavior.
- [ ] Fix the narrowest shared root cause.
- [ ] Keep regression coverage intact.
- [ ] Re-certify the exact fix SHA.

### N2 — 1006-case API certification
- [ ] Capture exact failing `TC-*` IDs from the current full DDT.
- [ ] Group by engine, command, HTTP status, and error signature.
- [ ] Identify first causal stateful failure in each cluster.
- [ ] Fix each root cause and add regression coverage.
- [ ] Re-run the full sequential suite after each cluster.
- [ ] Exit only at 1006/1006 PASS, 0 skipped, 0 todo.

### N3 — Persistence and schema certification
- [ ] Run PostgreSQL migration from an empty database.
- [ ] Verify latest schema version and invariants.
- [ ] Add expected-vs-live schema drift detection.
- [ ] Run representative 4.x upgrade migration test.
- [ ] Run File/PostgreSQL persistence conformance suite.
- [ ] Verify replay/audit/idempotency after restart.

### N4 — Release provenance
- [ ] Generate SBOM for the certified dependency graph.
- [ ] Record Git SHA/version in build metadata.
- [ ] Record image digest and release artifact checksums.
- [ ] Attach same-SHA certification evidence.
- [ ] Verify lockfile/manifests are reproducible.

### N5 — Deployment certification
- [ ] Validate Coolify Compose from clean checkout.
- [ ] Verify PostgreSQL readiness dependency and `/api/v1/ready`.
- [ ] Verify no direct public API port exposure.
- [ ] Execute HTTPS staging smoke.
- [ ] Restart API/Web and verify durable PostgreSQL state survives.
- [ ] Execute backup/restore smoke before calling staging production-ready.

### N6 — 4.33.1 hardening
- [ ] Auth/session replay, rotation, revocation, restart, clock-skew.
- [ ] Production fail-closed CORS/JWT/cookie/proxy checks.
- [ ] PostgreSQL timeout/pool/recovery/backup/rollback drill.
- [ ] Witness restart/checkpoint/backup/integrity certification.
- [ ] Structured logs, metrics, redaction, DB/queue/Witness diagnostics.
- [ ] Graceful shutdown and rollback rehearsal.

### N7 — 4.34 → 4.36 platform progression
- [ ] Complete OpenAPI route/schema parity.
- [ ] Generate/verify SDK against staging.
- [ ] Freeze API compatibility/deprecation harness.
- [ ] Finalize AI provider bounds/evaluation/provenance.
- [ ] Finish worker PostgreSQL lease/retry/DLQ production path.
- [ ] Run concurrency/performance baselines.
- [ ] Execute real Coolify staging for Web/CAB/XRP/Flow.
- [ ] Browser/API governance/accessibility/localization smoke.

### N8 — 5.0.0 release candidate
- [ ] Freeze public API/SDK/event/job compatibility.
- [ ] Freeze schema migration/rollback policy.
- [ ] Finalize deployment topology/resource requirements.
- [ ] Complete threat model/security review.
- [ ] Complete DR and upgrade rehearsal from latest 4.x.
- [ ] Produce reproducible RC provenance package.
- [ ] Run final self-hosted RC certification.
- [ ] Merge only the exact certified SHA to `main`.

## V5 stable package boundary workstream
- ✅ `docs/architecture/PACKAGE_BOUNDARIES_V5.md` defines extraction/freeze policy without changing runtime structure during 4.33.0 certification.
- 🟢 Freeze candidate: `@moonwitness/contracts`.
- 🟢 Stable API: `@moonwitness/ui` and `@moonwitness/sdk`.
- 🟡 Stable contract / evolving adapters: persistence.
- 🟡 Extract after 4.33.0: `@moonwitness/protocol`, `@moonwitness/evidence`, `@moonwitness/review`.
- 🔴 Keep internal/evolving for now: kernel internals, engines, AI, governance implementation, Revelation internals, Witness internals, worker internals, domain adapters.
- Rule: do not perform large package moves until the 4.33.0 certification gate is green; extraction must preserve the current dependency direction and release evidence.

## Release train
`4.33.0 → 4.33.1 → 4.34.0 → 4.35.0 → 4.36.0 → 5.0.0`

`dev` is development/integration. Automatic CI is intentionally disabled on `dev`; certification runs on PRs to `main`, pushes to `main`, or manual dispatch using self-hosted `cosmic`.

## P0 — 4.33.0
- [ ] #23/#44 — fix 32 DDT root causes; target 1006/1006 PASS with no coverage reduction.
- [ ] #35 — final release gate: PostgreSQL, typecheck, lint, builds, Docker, dependency, OpenAPI, Coolify, release identity.
- [ ] #45 — SBOM/provenance/artifact integrity.
- [ ] #46 — PostgreSQL schema/migration inventory and drift detection; migration schema is now PostgreSQL-only.
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
- ✅ PostgreSQL-only migration schema; `packages/persistence/src/schema.ts` no longer carries SQLite migration SQL.
- ✅ SQLite outside the supported runtime surface; supported drivers are `memory`, `file`, and `postgres`.
- ✅ HTTP security baseline and contract coverage.
- ✅ API error/pagination/idempotency contracts.
- ✅ Authorization, AI governance, queue lifecycle, UI governance, and runtime API configuration contracts.
- ✅ Witness/recovery, release-evidence, runtime worker/rate-limit, and OpenAPI baseline contracts.
- ✅ Targeted DDT diagnostic runner with `DDT_FROM` / `DDT_TO` / `DDT_IDS` filtering and status/body failure clustering.
- ✅ `npm run ddt:debug` wrapper for deterministic local diagnosis.
- ✅ DDT test-only rate-limit isolation; production abuse limits remain covered separately.
- ✅ `dev` is not an automatic CI trigger; `main` is the certification/release path.
- ✅ PostgreSQL recovery runbook explicitly states restore is offline and there is no remote destructive restore API.

## Rules
1. Do not delete or weaken certification coverage to obtain green results.
2. Every production bug gets a regression test.
3. API changes update schemas/contracts and compatibility tests.
4. Schema changes include migration/recovery consideration.
5. Production security fails closed.
6. Historical documents never override this active Todo or `docs/ENGINEERING_ROADMAP.md`.
7. `main` accepts only same-SHA certified release commits.
