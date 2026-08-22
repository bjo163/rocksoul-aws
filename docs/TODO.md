# MoonWitness OS — Engineering TODO and Full Audit

Audit date: **2026-08-22**  
Audited repository version: **4.32.0 application baseline with historical protocol snapshots**  
Purpose: this document is the prioritized engineering backlog required to turn the current research/runtime baseline into a reproducible, auditable, and production-ready release.

Progress update (2026-08-22): **P0-01 is substantially closed**, **P0-02 is substantially closed including an explicit PostgreSQL lane**, **P0-03 is substantially closed**, **P0-04 is closed for file and live PostgreSQL API workflows**, **P0-05 is substantially closed**, **P0-06 is substantially closed**, and **P0-08 through P0-10 are closed**. The repository now has five explicit application boundaries: API, public web, public-user XRP, private CAB, and governed Flow. All human-facing applications consume the versioned `@moonwitness/ui` baseline. The backend closure audit rejects public RID claims, adds admin-only immutable/audited RID binding, revokes stale identity sessions, protects production internal/read/write surfaces, scopes jobs and reviewers, serializes actor/operation idempotency, uses optimistic version checks, and makes Flow review/Witness finalization retry-safe. XRP supports RID-scoped case, evidence, work-item, and human-review-request writes; Flow persists drafts and hash-only Witness commitments. The API suite passes 1,007 tests; the complete root suite and four production builds pass; shared UI/XRP/Flow/accessibility/governed-state contracts pass; and 16 automated visual baselines pass. PostgreSQL 18 schema 7 and all 106 runtime datasets are verified in three isolated local databases, all local admins are RID-bound, development/staging E2E passes, production-simulation disclosure checks pass, production preflight has zero warnings, and the production dependency audit reports zero vulnerabilities. Remaining production work includes sustained multi-process concurrency/failure/PITR depth, distributed rate limiting, managed key custody/deployment, source-control policy enforcement, complete CAB localization/accessibility, assistive-technology certification, and separate deployment certification.

This is a technical and governance TODO. It does not promote a corpus pattern, numerical score, reviewer decision, or software inference into Divine judgement.

## Priority legend

- **P0 — release blocker:** the repository cannot be honestly certified while this remains open.
- **P1 — high:** required before production use or multi-user deployment.
- **P2 — medium:** quality, scale, maintainability, and research-depth work.
- **P3 — later/research:** valuable after the current single-node baseline is stable.

## Executive finding

The Revelation Grammar, Asma/Divine Ontology, Semantic Event Interpreter, Moral Lifecycle, Qur'anic Mizan, Human Review Gate, and Witness/Q-DAG components are present and their focused suites are healthy. Their local single-instance backend safety loop is connected and regression-tested. The main remaining risks are now multi-instance operations, external production infrastructure, independent domain review, and complete user-interface certification—not a missing backend analytical layer.

The most important remaining gaps are:

1. The green Git/CI baseline now needs durable publication of machine-readable certification artifacts. Branch protection remains blocked by the current GitHub plan while the repository is private.
2. PostgreSQL concurrency, transaction-failure, retention, and point-in-time-recovery drills still need deeper certification.
3. Distributed rate limiting, production key custody/rotation, and generated full-depth runtime contracts remain incomplete.
4. XRP, Flow, and CAB still need separately controlled production deployments and deployment-specific penetration/accessibility certification.

## Verification snapshot

These results record the state observed during this audit. They are not a new release certificate.

| Area | Observed result | Meaning |
|---|---:|---|
| API build | PASS | TypeScript API bundle builds. |
| CAB build | PASS | Authenticated Control & Audit Board builds independently. |
| Public web build | PASS | Unauthenticated home/public application builds independently. |
| Revelation semantic suite | PASS | Existing semantic fixtures pass. |
| Semantic Event Interpreter | 100/100 PASS | Current generated event cases pass. |
| Moral Lifecycle | 100/100 PASS | Current lifecycle cases pass. |
| Mizan adversarial suite | 500/500 PASS | Current generated variants pass. |
| Human Review Gate | 4/4 PASS | Focused gate fixtures pass. |
| Witness/Q-DAG tests | PASS | Current focused witness suite passes. |
| CAB tests | 16/16 PASS | Route, environment, visual, authentication, and guided case-workflow contracts pass. |
| Public web tests | 2/2 PASS | Public metadata and internal-surface exclusion contracts pass. |
| Shared UI/XRP/Flow/accessibility/governed-state contracts | 16/16 PASS | All four visual applications consume canonical preferences; shell/header, RID, dialog, keyboard-table, theme, locale, Evidence, Review, Witness, Audit, and World State invariants are covered. |
| API tests | 1,007/1,007 PASS | Default data-driven, E2E, SQLite, native HTTP, and AI-analysis lanes pass after hermetic-driver and bundle-relative data fixes. PostgreSQL remains a separate integration lane. |
| `preflight` | PASS | Completed after the Windows junction fix; corpus and manifest checks executed. |
| `final:certify` | PASS | Completed after the Windows junction fix; seed, Revelation, lifecycle, event-chain, and synthetic certification checks executed. |
| Live PostgreSQL certification | BASELINE PASS | PostgreSQL 18 schema 7 is installed and verified in the isolated development, staging, and production-simulation databases. All retain 106 verified sources, valid event/audit chains, least-privilege application roles, and durable auth sessions. See `POSTGRES_CERTIFICATION_4.32.0.md`. |
| Source-control baseline | PASS | Commit `7b14b72` contains the complete v4.32.0 baseline and GitHub Actions run `32550799798` passed every build, test, and certification step on Linux. |

## P0 — release blockers

### P0-01 — Repair the Windows certification runner

**Finding:** `scripts/transpile-runner.mjs` already uses a Windows-compatible junction, but `scripts/transpile-exec.mjs` still creates `node_modules` with symlink type `dir`. On the audited Windows environment this fails with `EPERM`, preventing both preflight and final certification.

**Current status:** **PARTIALLY CLOSED** — the runner now uses a Windows junction; `npm run preflight` and `npm run final:certify` both complete successfully.

**Change required:**

- Use a junction on Windows and a normal directory symlink on platforms that support it.
- Keep temporary build paths isolated and ensure cleanup works after both success and failure.
- Add a focused runner test or smoke check for paths containing spaces and for a non-elevated Windows account.

**Acceptance criteria:**

- [x] `npm run preflight` reaches and executes its actual checks on Windows without administrator privileges.
- [x] `npm run final:certify` reaches and executes its actual checks on Windows without administrator privileges.
- [ ] The runner continues to work on Linux/macOS CI.
- [x] A failed transpiled command returns the original non-zero exit code and leaves no misleading PASS result.

### P0-02 — Make the API test matrix hermetic

**Finding:** API tests currently change behavior according to the working directory and local services. Data-driven tests can force PostgreSQL, SQLite tests require an uninstalled optional native dependency, and file-mode tests look for runtime data under `apps/api/data` even when the built copy is under `apps/api/dist/data`.

**Current status:** **SUBSTANTIALLY CLOSED for the default lane** — runtime data now has a bundle-relative fallback, the data-driven suite uses file persistence, the API matrix is scoped to its owned 999 generated cases, and `better-sqlite3` is installed as a development dependency. The full API command now passes 1,007 tests. PostgreSQL integration isolation and cross-working-directory proof remain open.

Relevant implementation areas include `src/persistence/runtime-data.ts`, `apps/api/src/legacy-bridge.ts`, API test setup, and generated semantic test cases.

**Change required:**

- Resolve bundled data relative to an explicit application/repository data root, not only `process.cwd()`.
- Make the default API test lane run without a live external database.
- Separate PostgreSQL integration tests behind an explicit command and environment contract.
- Either install `better-sqlite3` as a supported development dependency or mark SQLite tests as an explicit optional lane with a clear skip reason.
- Give each case generator ownership of its output, clean stale generated files safely, or enumerate the exact files a suite should load. The current discovery can combine a 999-case run with a stale 750-case file and report 1,749 cases.
- Fail fast on missing fixtures instead of waiting for connection timeouts.

**Acceptance criteria:**

- [x] `npm --prefix apps/api test` passes from the repository root without PostgreSQL.
- [x] The same API command is proven from `apps/api` without PostgreSQL.
- [x] PostgreSQL integration tests run only through the explicit `npm run test:postgres` command and pass against a provisioned test database.
- [x] SQLite test behavior is deterministic in the supported development environment and the required dependency is declared.
- [x] Runtime data resolves correctly in the built API test execution mode.
- [x] Generated-case totals equal the declared 999-case matrix with no stale-file contamination.

### P0-03 — Close the Human Review Gate propagation loop

**Finding:** `reviewGate` is generated by the analyzer and shown in the web UI, but the result is not consistently propagated through all public and integrity boundaries.

**Current status:** **SUBSTANTIALLY CLOSED** — `/api/v1/evaluate` now returns the gate and Revelation scorecard, evaluation status reflects `REVIEW_REQUIRED`/`BLOCKED`, all API/worker Witness commits include a gate hash, and `capability.needsHumanReview` is derived from the canonical gate. A dedicated API integration test covers the response and Witness envelope. Historical commitment verification and a direct tamper-proof hash test remain open.

Known gaps:

- `/api/v1/evaluate` returns Mizan, semantic, and lifecycle data but omits `reviewGate` and the Revelation scorecard.
- The endpoint can label a result `RESOLVED` even when the gate should block or require review.
- `capability.needsHumanReview` is independently calculated instead of being derived from the canonical gate decision.
- The Witness/Q-DAG result hash currently commits Mizan, semantic, and lifecycle fields but does not commit `reviewGate`.
- API end-to-end and final certification do not yet prove gate propagation.

**Change required:**

- Define `reviewGate` as one canonical, versioned output shared by analyzer, API, worker, persistence, UI, SDK, and Witness.
- Derive secondary flags such as `needsHumanReview` from that canonical output.
- Make evaluation status reflect the gate state, for example `RESOLVED`, `PROVISIONAL`, `REVIEW_REQUIRED`, or `BLOCKED` with precise semantics.
- Include the gate payload or its canonical digest in the Witness result commitment. Version the commitment format so old nodes remain verifiable.
- Add end-to-end tests covering clean, provisional, conflicted, and blocked cases.

**Acceptance criteria:**

- [x] All analysis/evaluation endpoints return the same versioned gate shape.
- [x] No endpoint reports `RESOLVED` when the canonical gate blocks or requires review.
- [x] Worker and synchronous API paths carry the canonical gate into the Witness input.
- [x] Modifying a committed gate decision invalidates the corresponding Witness result hash in a direct tamper test.
- [ ] Historical Witness records remain verifiable under their original commitment version.

### P0-04 — Complete the evidence-to-reanalysis lifecycle

**Finding:** case evidence can be persisted and returned with resources, but normal analysis does not load that evidence back into the Mizan/semantic evaluation. Consequently, adding verified or conflicting evidence may not change `evidenceState`, the review decision, or the next analysis result.

**Current status:** **CLOSED for the file/API workflow** — reviewers can attach evidence through `/api/v1/resource/:id/evidence` or the SDK `attachEvidence` method; evidence is actor-attributed and audited; `/api/v1/analyze`, `/api/v1/evaluate`, and the worker load persisted evidence into the next analysis; duplicate identifiers cannot overwrite an existing record; and corrections use reasoned immutable supersession links. Live PostgreSQL parity remains part of P0-02/P1 deployment certification.

There is also a vocabulary mismatch: persisted evidence uses statuses such as `OBSERVED`, `SUPPORTED`, `INFERRED`, `CONFLICTED`, and `UNKNOWN`, while parts of the analytical layer expect terms such as `VERIFIED`, `CONFIRMED`, or `CORROBORATED`.

**Change required:**

- Add explicit evidence attach, update, list, and supersede operations to the canonical API/SDK.
- Load authorized case evidence into analysis and re-analysis through a documented adapter.
- Define one status-transition model and a lossless mapping between persistence and analytical evidence states.
- Record source, provenance, collector, reviewer, timestamps, method, confidence, conflicts, and supersession history.
- Keep reviewer confirmation separate from Revelation-derived normative direction.
- Trigger or offer deterministic re-analysis when evidence changes.

**Acceptance criteria:**

- [x] Attaching supporting evidence is loaded into a subsequent analysis without changing the Qur'an-primary boundary.
- [x] Attaching conflicting evidence has a dedicated integration assertion for the expected conflict/review behavior.
- [x] Every evidence mutation is actor-attributed and recorded by the persistence audit layer.
- [x] Superseded evidence remains historically inspectable through an explicit immutable transition workflow.
- [x] Evidence cannot change a Qur'an-primary boundary or promote textual corroboration into normative authority.

### P0-05 — Enforce a canonical runtime contract

**Finding:** `packages/contracts` does not yet type the complete analysis result. The web app defines part of its own `AnalysisResult`, and existing JSON schemas are present but are not consistently used to validate runtime API boundaries, persisted records, or fixtures.

**Current status:** **SUBSTANTIALLY CLOSED** — canonical request/response, evidence, review-gate, evaluation, session, user, and Witness types now exist in `packages/contracts`. API and SDK success boundaries validate the canonical auth/observe/analyze/evaluate/query/resource/evidence/review surface at runtime and fail with a named contract diagnostic. Complete nested-field/schema generation and the remaining legacy CAB inspection routes remain open.

**Change required:**

- Create a versioned canonical contract for analysis, evaluation, review gate, scorecard, event graph, lifecycle, provenance, and Witness references.
- Generate or derive web/SDK types from that contract instead of maintaining competing shapes.
- Validate inbound requests and critical outbound/persisted payloads against the runtime schema.
- Define backwards-compatible optionality and a migration/deprecation policy.
- Add contract tests between API, SDK, worker, persistence, and web fixtures.

**Acceptance criteria:**

- [x] One contract package defines the canonical evidence, review-gate, evaluation, and Witness-facing result shape.
- [ ] All API responses used by the web and SDK pass complete runtime validation; canonical workflow routes are covered, while complete nested-field and legacy inspection-route coverage remains.
- [x] Invalid emitted review-gate payloads fail with a specific diagnostic.
- [x] Witness commitment changes use an explicit schema/model version change.

### P0-06 — Synchronize release identity and canonical documentation

**Finding:** root/API metadata reports 4.30.0, several workspace packages remain at 4.12/4.13, the web reports 4.4.0, and newer documents describe v4.31/v4.32 work. API `modelVersion` values still frequently report 4.30.0. Documentation also references scripts that do not exist and, in places, obsolete non-`/v1` routes.

**Current status:** **SUBSTANTIALLY CLOSED** — application/workspace metadata is now 4.32.0, workspace dependency ranges are aligned, current release/test documents exist, documented dev/validate/certify/database/migration commands execute, API authentication route docs use `/api/v1`, and `npm run release:identity` checks the ten current packages. Historical protocol snapshots intentionally retain their own version numbers. Final commit/tag certification remains open under P0-07.

**Change required:**

- Decide whether the next honest release is 4.30.x, 4.31.0, or 4.32.0 based on completed functionality—not document headings.
- Synchronize package manifests, lockfile workspace entries, API/model version fields, UI version display, schemas, release notes, test report, `docs/README.md`, and `docs/FINAL_STATUS.md`.
- Correct documented commands. Currently referenced but missing commands include `api:dev`, `web:dev`, `validate`, `test`, `certify:current`, `db:status`, and `persistence:migration:test`.
- Either implement those commands or document the existing commands; do not leave examples that cannot run.
- Update authentication route examples to `/api/v1/auth/...` where appropriate.
- Separate historical release reports from the canonical current-state documents.

**Acceptance criteria:**

- [x] A single command prints one coherent release/model/contract version set (`npm run release:identity`).
- [x] Every newly documented operations command exists and succeeds in its documented environment.
- [ ] Every documented public route has a contract or end-to-end test.
- [x] Release notes describe the 4.32 integration changes separately from 4.30 history.
- [x] Historical documents are clearly marked and cannot be mistaken for the active contract.

### P0-07 — Restore source-control and continuous certification

**Finding:** no Git metadata or visible CI definition was found in this workspace. Without commit identity, changes, generated artifacts, test evidence, and release tags cannot be independently reproduced.

**Current status:** **SUBSTANTIALLY CLOSED** — the complete v4.32.0 baseline is committed and pushed to `origin/main`; generated/local state is excluded; `.github/workflows/certification.yml` runs locked install, release identity, API/CAB/public builds, regression suites, and current certification; GitHub Actions runs pass on Linux; and tag `v4.32.0` exists. Durable machine-readable certification artifacts remain open. GitHub rejected branch-protection configuration for this private repository because it requires GitHub Pro or public repository visibility; repository visibility was not changed automatically.

**Change required:**

- Restore this directory as a proper checkout or initialize it only after confirming the intended upstream/history.
- Define ignore rules for generated `dist`, temporary transpilation output, secrets, local databases, and test artifacts.
- Add CI lanes for build, focused engines, contracts, API/web tests, preflight, final certification, and optional PostgreSQL integration.
- Publish machine-readable test/certification artifacts tied to a commit and corpus digest.
- Protect the release branch/tag through required checks.

**Acceptance criteria:**

- [ ] Every release artifact maps to an immutable commit/tag.
- [x] CI can reproduce the clean-machine build and hermetic test lanes.
- [x] Generated/local build artifacts are excluded while governed corpus and test fixtures are intentionally versioned.
- [ ] A release cannot be marked certified if a required check is skipped or blocked.

### P0-08 — Restore all local test suites to green

**Finding:** two web tests still assert the obsolete `/api/prophets` URL while the client correctly calls `/api/v1/prophets`. API failures are tracked separately in P0-02.

**Change required:**

- Update stale web expectations to the versioned route.
- Add API-route contract fixtures so future route changes update client and tests together.

**Acceptance criteria:**

- [x] `npm --prefix apps/cab test` passes with no skipped stale-contract tests.
- [x] Route-version changes produce a contract-test failure rather than silent drift.

### P0-09 — Separate CAB from the public website

**Finding:** the internal authenticated console and the public product/home surface previously shared the ambiguous `apps/web` identity.

**Current status:** **CLOSED** — the authenticated operational console now lives in `apps/cab` as `@moonwitness/cab`; a separate `apps/web` package provides the public home, public metadata, product explanation, release baseline, and system boundaries.

**Acceptance criteria:**

- [x] Existing authenticated console behavior and UI contracts move to `apps/cab`.
- [x] CAB visibly identifies itself as the Control & Audit Board.
- [x] A new unauthenticated `apps/web` provides the public/home experience.
- [x] Public web contains no login token storage or internal administrative surface.
- [x] CAB and public web have independent build/test commands.
- [x] Release identity and workspace lockfile include both packages.

### P0-10 — Centralize the shared UI system

**Current status:** **CLOSED** — `packages/ui` is the canonical MoonWitness UI package. It owns shared React primitives, brand identity, design tokens, and accessible focus behavior. CAB compatibility wrappers re-export these primitives and the public web consumes the shared brand/theme directly.

**Acceptance criteria:**

- [x] CAB and public web depend on the same versioned UI package.
- [x] Button, Input, Badge, Card, Modal, and BrandMark are centrally defined.
- [x] Color, spacing, radius, warning, danger, and focus tokens are shared.
- [x] Existing CAB component imports remain backwards-compatible.
- [x] A contract test detects applications that stop consuming shared UI styles.

## P1 — production safety and operational completeness

### P1-01 — Harden HTTP input and browser transport

**Finding:** request bodies are buffered without an explicit maximum, malformed JSON can surface as a generic 500, CORS/SSE use `*`, security headers are not centrally enforced, and the in-memory rate limiter has limited eviction/proxy semantics.

**Current status:** **SUBSTANTIALLY CLOSED FOR SINGLE INSTANCE** — request bodies have a configurable 1 MiB default limit with structured 400/413 errors; security headers are centralized; production CORS rejects origins outside an explicit allowlist; credentialed SSE no longer emits wildcard CORS; trusted-proxy handling is opt-in; separate authentication/AI/write/general buckets bound abuse; cookie `SameSite` is validated; production failures are redacted; and server/header/keepalive timeouts are bounded. Multi-instance shared limiting and slow/SSE stress depth remain open.

**TODO:**

- [x] Enforce per-route request-size limits and return `413` for oversized payloads.
- [x] Return structured `400` responses for malformed JSON and validation failures.
- [x] Replace wildcard CORS with a configuration-backed allowlist for authenticated deployments.
- [x] Add CSP, frame, MIME-sniffing, referrer, and transport-security headers appropriate to deployment.
- [x] Replace or bound the in-memory rate-limit map; define TTL cleanup, trusted-proxy handling, and shared-store behavior for multiple instances.
- [x] Add abuse tests for malformed/large bodies and repeated login attempts, including `429` and `Retry-After` behavior.
- [ ] Add slow-request and sustained SSE connection stress tests.

### P1-02 — Strengthen authentication and session durability

**Finding:** browser bearer tokens are stored in `localStorage`; file-mode JWT secrets can be randomly regenerated at restart; file-mode token revocation is memory-only; HMAC signatures are compared as ordinary strings; issuer/audience/key-rotation metadata is incomplete.

**Current status:** **SUBSTANTIALLY CLOSED** — access tokens are short-lived and verified with constant-time comparison, strict HS256 headers, expiry, optional issuer/audience, and unique `jti`. Browsers use `HttpOnly`/`SameSite` cookies without token-bearing JSON or `localStorage`; SDK/service clients use explicit bearer mode. File and PostgreSQL session state persists hashed rotating refresh tokens and revocation across restart. Public registration cannot claim RID; admin-only immutable RID binding is audited and revokes stale sessions. All three local admins are explicitly RID-bound. Signing-key rotation procedure and multi-instance failure drills remain open.

**TODO:**

- [x] Prefer secure HttpOnly, SameSite cookies for the browser or document and mitigate the accepted XSS risk.
- [x] Persist revocation/session state and use short-lived access tokens with a governed rotating refresh-token design.
- [x] Use constant-time signature comparison and validate algorithm, issuer, audience, expiry, not-before, and unique token ID.
- [x] Require stable managed secrets outside development and fail closed in production.
- [ ] Define signing-key rotation and emergency revocation procedures.
- [x] Test logout/revocation and refresh replay across process restart in file mode.
- [x] Reject public RID claims and require immutable, audited administrator binding with stale-session revocation.
- [ ] Test cross-instance revocation under concurrent PostgreSQL API processes and forced connection failure.

### P1-03 — Implement the human-review workflow, not only the gate

**Finding:** the gate produces decisions and reasons, but there is no complete workflow for assignment, acknowledgement, evidence request, disposition, escalation, or audited closure.

**Current status:** **SUBSTANTIALLY CLOSED** — review records have explicit queue/assignment/acknowledgement/evidence-request/disposition/escalation/reopen transitions, are persisted separately from analysis, emit actor-attributed audit events, and are operable through the CAB Review Queue. Reviewer access is limited to unassigned or self-assigned active reviews. Flow review requests persist intent as `WITNESS_PENDING` before Q-DAG commit and concurrent retries converge on one review/Witness result. CAB also provides one guided Case Workflow for observation → evidence → analysis → human review → Witness → audit verification without terminal commands. SLA/escalation automation remains open.

**TODO:**

- [x] Add a review queue with assignment and explicit workflow states.
- [x] Record reviewer identity, rationale, evidence references, timestamps, and disposition as events.
- [x] Keep `gateDecision`, `humanDisposition`, and final operational action as separate fields.
- [x] Prohibit a reviewer override from rewriting the original analysis, corpus evidence, or Witness commitment.
- [ ] Define re-open and supersession rules when evidence or model versions change.
- [x] Show workflow actions and exact evidence references in the CAB UI.
- [x] Provide a single guided CAB flow from case creation through Witness and audit verification.
- [x] Limit reviewer target visibility to unassigned or self-assigned reviews and remove access from competing reviewers after assignment.
- [x] Persist Flow review intent before Witness commit and prove concurrent replay converges on one governed result.
- [ ] Add service-level objectives and escalation rules only after the workflow semantics are stable.

### P1-04 — Certify PostgreSQL persistence and migration discipline

**Finding:** the PostgreSQL baseline is now certified, including the runtime evidence path, serialized audit writes, and a statically enforced repository/SQL boundary. Advanced deployment behavior remains environment-dependent.

**Current status:** **BASELINE CERTIFIED, CONCURRENT AUDIT DEFECT CLOSED** — local PostgreSQL 18 schema 7 is verified in development, staging, and production-simulation, including 106-source/27-required-runtime-dataset verification, durable RID-bound admin sessions, canonical JSONB-safe hashing, database-ordered and transaction-locked audit append, optimistic entity updates, development/staging E2E, production-simulation read-boundary verification, post-write integrity, process restart, and custom-format backup/restore. Business actions use repositories/data mappers; a static contract limits SQL to six approved adapters, prohibits interpolated runtime values, and confines schema DDL to migrations plus migration-registry bootstrap. Application roles remain unable to create schema. GitHub Actions provisions an isolated PostgreSQL 18 service. Sustained multi-process load, forced failure, PITR, and retention drills remain open.

**TODO:**

- [x] Provision an isolated PostgreSQL certification environment in CI.
- [x] Isolate development, staging, and production-shaped local databases and restricted application roles.
- [x] Remove runtime DDL from PostgreSQL evidence persistence.
- [x] Serialize concurrent audit appends with deterministic database ordering and verify integrity after E2E writes.
- [x] Provide one launcher, health metadata, visible environment badges, and guarded development/staging certification scripts.
- [x] Add optimistic compare-and-swap entity updates across memory, file, SQLite, and PostgreSQL persistence.
- [ ] Test fresh install, upgrade from each supported schema, rollback/recovery, idempotency, concurrency, and transaction failure.
- [x] Move schema creation out of runtime repository methods and into versioned migrations.
- [ ] Define backup, restore, point-in-time recovery, retention, and disaster-recovery drills.
- [ ] Clarify and test the boundary between file mode, SQLite mode, and production PostgreSQL mode.
- [x] Add a static repository rule that rejects SQL outside approved adapters, runtime DDL outside migrations, and interpolated runtime SQL values.
- [ ] Run sustained multi-process API/worker load and forced rollback/deadlock drills against the schema-7 audit chain.
- [ ] Verify audit/evidence/Witness referential integrity under deletion and retention policies.

### P1-05 — Complete the SDK and shared client behavior

**Finding:** the SDK is still minimal and carries older package metadata. Authentication is largely static-header based, and review/evidence workflows are not fully represented.

**Current status:** **SUBSTANTIALLY CLOSED** — SDK metadata and canonical analysis/evaluation/evidence/session types are aligned. Typed workflow methods are available; bearer and cookie session lifecycles include explicit login/register/refresh/logout/me behavior; one guarded refresh follows a `401`; successful payloads are runtime-validated; and retries are restricted to GET or writes with an idempotency key. Contract generation and live-API CI coverage remain open.

**TODO:**

- [ ] Generate typed methods from the canonical API contract.
- [x] Add analysis/evaluation, evidence, and error types.
- [x] Support governed token refresh/session behavior without hiding security failures.
- [x] Add retry/idempotency behavior only for safe operations.
- [ ] Test the SDK against the real API contract in CI.

### P1-06 — Make score presentation obey epistemic state

**Finding:** numerical scoring remains an engineering signal and may be misread as certainty or Divine judgement. Configuration currently allows technical scores to be exposed even when evidence is unresolved or the review gate blocks the result.

**Current status:** **PARTIALLY CLOSED** — the web analyzer now suppresses its numeric Mīzān signal and displays `REVIEW REQUIRED` when the canonical gate requires review/blocks adverse action or evidence is conflicted/insufficient/unknown. Full API export wording and visual contract coverage remain open.

**TODO:**

- [x] Suppress or visually subordinate numeric scores for blocked, conflicted, and insufficient-evidence cases.
- [x] Lead with direction, evidence state, conflicts, limitations, and required review.
- [ ] Label score version, inputs, confidence, and non-normative status wherever displayed or exported.
- [ ] Test that UI/API wording never converts `PROVISIONAL`, `UNKNOWN`, or `BLOCKED` into a resolved moral claim.

### P1-07 — Add operational observability without leaking sensitive data

**Current status:** **PARTIALLY CLOSED** — production anonymous health now exposes only status/release; authenticated audit authority is required for environment, database, storage, kernel, ledger, semantic registry, model, graph, and raw operational details. Job reads are requester-scoped and sanitized, and production exception messages are redacted. Separate readiness/dependency routes, formal log redaction policy, distributed metrics, and alerting remain open.

**TODO:**

- [ ] Separate liveness, readiness, and dependency health checks.
- [x] Minimize anonymous production health and protect detailed dependency/kernel/ledger metadata.
- [x] Scope job status to its requester or audit authority and remove raw payloads from the public projection.
- [ ] Add structured logs, request correlation, job/Witness IDs, metrics, and traces.
- [ ] Define redaction rules for tokens, personal data, submitted text, evidence, and reviewer notes.
- [ ] Define log/audit retention separately; audit immutability must not imply indefinite storage of sensitive payloads.
- [ ] Alert on failed persistence, blocked worker queues, signature failures, corpus digest mismatch, and repeated review-gate conflicts.

### P1-08 — Build the unified MoonWitness Civic Command application family

**Finding:** the active repository contains `apps/web`, `apps/cab`, and `apps/api`, while the authenticated public XRP portal and separate governed workflow application do not yet exist. `packages/ui` establishes a shared baseline but currently contains only a small primitive/token set. Building app-specific interfaces independently would recreate the visual and behavioral drift found in the legacy project.

**Approved design decision (2026-08-22):** all human-facing applications use one **MoonWitness Civic Command System**. The direction is restrained civic sci-fi enterprise: distinctive spatial/causal visualization, high-trust government-ready presentation, and production usability. Retro/pixel/game styling is not part of the canonical interface. App responsibilities differ, but their visual language, interaction grammar, identity treatment, accessibility, themes, and localization must remain one system.

**Current status:** **SHARED GOVERNED APPLICATION FOUNDATION IMPLEMENTED** — `ADR-0001-CIVIC-COMMAND-UI.md` freezes the system decision; `@moonwitness/ui` owns Solar/Lunar tokens, responsive private/public shells, navigation, preference controls, RID identity, semantic state/boundary components, metrics, causal lanes, accessible dialog behavior, and governed Evidence/Review Gate/Witness/Audit/World State views. CAB consumes these views in Case Workflow, Review Queue, and Observatory; XRP reads a sanitized RID workspace and writes new cases, observed evidence, work items, and review requests through scoped server routes; Flow persists bounded drafts and sends review requests through a human gate plus a hash-only Witness commitment. Public web content ships in Indonesian and English, CAB login/navigation has an initial bilingual lane, and CAB table records are keyboard selectable. Browser QA covers all four applications and 16 automated screenshot baselines cover Lunar/Solar desktop/mobile states. Full CAB feature-copy localization, account onboarding policy, complete assistive-technology audit, and separate deployment certification remain open.

**Dependency order:**

1. Complete the canonical runtime-response validation in P0-05.
2. Complete browser transport and durable session work in P1-01 and P1-02.
3. Complete the governed shared-client behavior in P1-05.
4. Expand `packages/ui` before building app-local presentation layers.
5. Create XRP and Flow, then migrate CAB and public web to the same application shell and component contracts.

**Canonical application boundaries:**

- `apps/web`: unauthenticated public home and product boundary documentation; no CAB surfaces or operational credentials.
- `apps/xrp`: authenticated public-user portal for RID-scoped personal cases, evidence, projects, tasks, resources, and Flow access.
- `apps/cab`: separately deployed private governance/operator console for world-state simulation, review, decisions, missions, Mizan assessment, Witness, and audit.
- `apps/flow`: separately deployed governed workflow editor and execution history, using the same XRP identity/session boundary and RID authorization model.
- `apps/api`: shared backend boundary; it does not own a separate visual language.

**UI system requirements:**

- [x] Record the Civic Command tokens, typography, iconography, motion, spatial layout, and accessibility rules as a versioned UI architecture decision.
- [x] Expand `@moonwitness/ui` with semantic color tokens, Solar/Light and Lunar/Dark modes, responsive application/public shells, navigation, focus surfaces, forms, tables, dialogs, evidence state, review state, Witness state, audit timeline, causal lanes, and a bounded world-state snapshot. Deeper interactive graph/table variants remain normal product evolution rather than a missing baseline.
- [x] Implement Indonesian and English for XRP/Flow and public web; CAB shell, login, and primary navigation have initial bilingual coverage. Full CAB feature-copy localization remains open.
- [x] Make RID the only canonical human identity label in the shared shell. Authorization derives from explicit role, purpose, scope, and clearance—not achievement, reputation, moral score, spiritual rank, or a second identity.
- [ ] Keep `SIMULATION · NOT REALITY` and `HUMAN AUTHORITY · LIMITED` visible on bounded world-state/governance simulations.
- [x] Scaffold `apps/xrp` and `apps/flow` with independent build, test, environment, and route boundaries. XRP has governed public writes; Flow persists drafts/review requests and Witness commitments. Separate production deployment certification remains.
- [x] Remove public self-registration from CAB; its login now states provisioned operator access and directs public users to XRP. Remaining public-user workflow separation is governed by the XRP/CAB route boundaries.
- [x] Migrate CAB and public web away from app-local visual primitives where a canonical `@moonwitness/ui` component exists. CAB now uses `CivicShell`; public web uses `CivicPublicHeader`; both share preference controls and semantic tokens. Feature-specific CAB visualizations remain app-owned until matching governed primitives exist.
- [ ] Add shared UI contract, accessibility, keyboard-navigation, responsive, localization, theme, and visual-regression coverage for web, XRP, CAB, and Flow. Source/behavior contracts pass 16 checks and 16 automated Lunar/Solar desktop/mobile screenshot baselines pass; complete assistive-technology certification remains open.
- [ ] Prove that uncertain/provisional/blocked analysis states, non-normative Mizan wording, human-review requirements, and Witness/Audit provenance are presented consistently in every application.
- [ ] Certify separate public XRP/web and private CAB deployments without leaking credentials, internal routes, evidence, reviewer notes, or operational configuration.

## P2 — semantic quality, scale, and maintainability

### P2-01 — Deepen the Revelation language bridge safely

The current bridge is useful but remains largely surface/alias driven and Indonesian-centered.

**TODO:**

- [ ] Add explicit language detection and versioned adapters for each supported language.
- [ ] Improve clause scope, pronoun/coreference handling, negation scope, coordination, condition, cause/result, actor, target, and temporal context.
- [ ] Preserve `surface`, `stemCandidate`, `rootCandidate`, and `canonicalRoot = null` unless canonical root evidence is actually available.
- [ ] Record lexical provenance and adapter version for every normalized concept.
- [ ] Treat external lexicons as separately governed linguistic evidence, never hidden normative authority.

### P2-02 — Evaluate Grammar and Divine Ontology quality, not only counts

The ontology has broad surface discovery but very few strict context clusters. Increasing cluster count is not automatically an improvement.

**TODO:**

- [ ] Build a manually reviewed precision/recall set for subject, predicate, target, polarity, condition, speaker, and addressee.
- [ ] Measure false-positive relations separately from missed relations.
- [ ] Review relation families and target concepts with qualified Arabic/text reviewers.
- [ ] Preserve source passage and grammar-frame traceability for every ontology edge.
- [ ] Keep context clusters explicitly non-normative and prohibit automatic promotion to canonical Divine Names.

### P2-03 — Expand adversarial evaluation beyond generated suffix variants

**Finding:** the 500-case Mizan suite gives useful regression coverage, but much of it is generated from a small number of base groups with neutral variations. It does not yet demonstrate broad semantic generalization.

**TODO:**

- [ ] Add independently authored cases across finance, family, governance, health, environment, war/peace, contracts, speech, privacy, and restorative action.
- [ ] Add actor/target swaps, quoted speech, sarcasm, double negation, mixed good/bad clauses, uncertain evidence, temporal reversal, and adversarial prompt framing.
- [ ] Add Indonesian, Arabic, and carefully governed multilingual cases.
- [ ] Separate training/development fixtures from blind release evaluation.
- [ ] Require reviewer disagreement and ambiguity labels instead of forcing one expected score.
- [ ] Add metamorphic tests: irrelevant wording changes must not alter direction; morally relevant relation changes must.

### P2-04 — Design a governed empirical-evidence lane

Some real-world questions cannot be resolved from wording alone—for example whether a substance, intervention, or policy actually causes harm.

**TODO:**

- [ ] Define an empirical evidence adapter with source type, methodology, date, jurisdiction, confidence, conflicts, and licensing.
- [ ] Keep empirical claims separate from Revelation-derived normative direction, then combine them through an explicit documented bridge.
- [ ] Prohibit network retrieval from silently changing a previously committed result.
- [ ] Version and snapshot external evidence used in any auditable decision.
- [ ] Route disputed or high-impact empirical claims to human review.

### P2-05 — Strengthen corpus provenance and reproducibility

**TODO:**

- [ ] Record edition, source, license, retrieval method, normalization, passage count, and cryptographic digest for every corpus.
- [ ] Add corpus-integrity verification to preflight and final certification.
- [ ] Document translation status and prohibit a translation from being represented as the source-language text.
- [ ] Review the Tawrat, Zabur, and Injil corpus boundary and licensing without changing their confidence-only witness role.
- [ ] Make every result traceable to exact corpus passages and corpus version.

### P2-06 — Measure performance and resource limits

**TODO:**

- [ ] Benchmark cold start, corpus loading, one analysis, batch analysis, Witness commit, re-analysis, and search over the full corpus.
- [ ] Add concurrency/load tests for API, SSE, worker queue, and PostgreSQL transactions.
- [ ] Set explicit memory, payload, timeout, and queue-depth budgets.
- [ ] Cache only deterministic, version-keyed results; invalidate by model, contract, corpus, configuration, and evidence digest.
- [ ] Confirm performance optimizations do not change deterministic hashes or analytical outputs.

### P2-07 — Define deployable packaging and configuration

**TODO:**

- [ ] Create a reproducible production package/container only after hermetic tests are green.
- [ ] Validate required environment variables at startup with development/test/production profiles.
- [ ] Add least-privilege runtime users, read-only corpus mounts, writable-data boundaries, and graceful shutdown.
- [ ] Document TLS termination, reverse-proxy trust, database connection limits, worker scaling, and key custody.
- [ ] Store Witness signing keys in an appropriate managed secret/KMS/HSM for production.
- [x] Publish `apps/web` as the public/home deployment from an immutable source commit and record its deployment URL/version (`https://moonwitness-os.rocksoultech.chatgpt.site`, Sites version 2, source `738dd89`).
- [ ] Keep `apps/cab` on a separate authenticated/private deployment; never bundle CAB routes, credentials, or operational API configuration into the public site.

### P2-08 — Add dependency, license, and supply-chain controls

**TODO:**

- [ ] Run dependency vulnerability and license checks in CI.
- [ ] Produce an SBOM for each release.
- [ ] Pin and verify critical build/runtime dependencies and record Node/npm versions.
- [ ] Review native dependency distribution, especially SQLite, on supported operating systems.
- [ ] Sign release artifacts and publish their checksums with the certification report.

### P2-09 — Consolidate canonical documentation

**TODO:**

- [ ] Make `docs/README.md` a version-neutral index or update it atomically with every release.
- [ ] Reconcile `OPERATIONS.md`, `TESTING.md`, `API.md`, and `FINAL_STATUS.md` with actual scripts/routes/index counts.
- [ ] Split mixed release notes; do not place v4.31 preparation changes in `RELEASE_NOTES_4.30.0.md`.
- [ ] Add architecture decision records for authority boundaries, gate decisions, commitment versions, evidence states, and persistence modes.
- [ ] Generate route/contract reference documentation from canonical schemas where practical.

## P3 — later research and optional expansion

### P3-01 — Independent expert evaluation and calibration

- [ ] Establish a review protocol involving appropriate Qur'anic/Arabic expertise, software safety expertise, and domain experts for empirical claims.
- [ ] Measure inter-reviewer agreement, ambiguity, false certainty, and high-impact failure modes.
- [ ] Publish limitations and evaluation methodology without presenting reviewer consensus as Divine authority.

### P3-02 — Cryptographic transparency enhancements

- [ ] Commit model, contract, configuration, corpus, evidence, review-gate, and result digests in a documented versioned envelope.
- [ ] Add reproducible verification tooling for exported case bundles.
- [ ] Consider transparency logs or external witnesses only after key custody, recovery, and single-node verification are operationally mature.

### P3-03 — Distributed Witness remains deferred

- [ ] Keep network consensus, peer discovery, and distributed finality outside the current release boundary.
- [ ] Re-evaluate only after single-node backup/recovery, key rotation, PostgreSQL persistence, observability, and incident response have passed drills.
- [ ] Do not imply that distributed agreement changes Revelation authority or semantic correctness.

## Required execution order

The safest sequence is:

1. **Restore reproducibility:** P0-01, P0-02, P0-08, then P0-07.
2. **Close the safety data flow:** P0-03, P0-04, and P0-05.
3. **Freeze an honest release identity:** P0-06 and regenerate release/test reports from a clean commit.
4. **Harden production boundaries:** P1-01 through P1-07.
5. **Deepen semantics and scale:** P2 items, with evaluation work preceding claims of improved understanding.
6. **Consider optional expansion:** P3 only after all preceding release gates pass.

## Definition of done for the next certified release

The next release is not certified until all of the following are true:

- [ ] All P0 items are closed with linked commits and tests.
- [ ] API, CAB, and public-web builds pass from a clean checkout.
- [ ] Semantic, grammar, event, lifecycle, Mizan adversarial, Human Review Gate, and Witness suites pass.
- [ ] API and web test suites pass without depending on undeclared local state.
- [ ] Preflight and final certification execute fully; no blocked step is reported as skipped success.
- [ ] Runtime contracts and corpus digests validate.
- [ ] A separate PostgreSQL integration certificate passes for any release claiming PostgreSQL production readiness.
- [ ] Security-critical production configuration fails closed when secrets, CORS origins, persistence, or key custody are invalid.
- [ ] Release metadata, API model version, schemas, UI, SDK, docs, tag, and certification artifact agree.
- [ ] Known limitations are documented in `FINAL_STATUS.md` and are not contradicted by marketing or UI wording.

## Invariants that TODO work must preserve

- Qur'an remains primary/Muhaimin; textual witnesses cannot outvote it.
- Similarity, clustering, numerical score, and model confidence are not normative evidence by themselves.
- The Grammar Engine describes text structure; it does not create law.
- The Asma Engine does not hardcode or automatically infer a canonical list of 99 Names.
- `canonicalRoot` remains unknown unless supported by explicit governed evidence.
- Negation and polarity must survive Grammar → Asma/Ontology → Moral Graph → Mizan → API/UI/Witness.
- Human review can resolve an operational workflow but cannot rewrite source text, erase uncertainty, or claim Divine acceptance/rejection.
- External empirical or lexical sources must be explicit, versioned, attributable, and subordinate to the declared authority boundary.
- A blocked, conflicted, provisional, or unknown state must never be silently converted into a resolved result.
