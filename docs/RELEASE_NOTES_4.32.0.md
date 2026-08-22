# Release Notes — 4.32.0

## Human Review & Explainability Gate

- Added `src/ai/human-review-gate.ts`.
- Added `schemas/human-review-gate.schema.json`.
- Analysis responses now expose `reviewGate`.
- UI displays decision, severity, evidence gaps, and review reasons.
- `ACTUAL_CONFLICT` and reserved unseen outcomes block adverse action.
- Provisional, unverified, insufficient, and empirically incomplete cases
  require human review.
- No gate decision is a divine verdict or a revealed punishment quantity.

## Evidence, contract, and certification integration

- Persisted case evidence can be attached through the versioned API and SDK and is loaded into subsequent analysis.
- Evidence statuses include explicit `VERIFIED` and `CORROBORATED` states while remaining auditable and non-authoritative.
- `/api/v1/evaluate` returns the canonical review gate and Revelation scorecard.
- Witness Mizan commitments use `MW-MIZAN-WITNESS-V2` and include a review-gate hash.
- API, SDK, and web share canonical contract types for review gate and evidence records.
- Windows preflight/final certification uses a non-elevated-compatible junction runner.
- The default API matrix is hermetic and currently passes 1,007 tests; live PostgreSQL certification remains deployment-specific.
- HTTP boundaries now enforce configurable body limits, structured malformed-JSON errors, security headers, and production CORS allowlists.
- Local JWT verification now uses constant-time signatures, claim checks, unique token IDs, and fails closed on implicit production secrets.
- Human-review records now support audited queue, assignment, acknowledgement, evidence-request, disposition, escalation, and reopen transitions.
- The authenticated console moved from `apps/web` to the dedicated `apps/cab` Control & Audit Board.
- A new independent `apps/web` provides the public MoonWitness home and communicates system boundaries without exposing internal controls.
- Evidence attachment is append-only at the API boundary; corrections create explicit supersession links and preserve the original record.
- CAB now includes an operational Review Queue with guarded state transitions.
- Added `@moonwitness/ui` as the shared component, brand, token, and accessibility layer used by both CAB and the public website.
- Published the independent public home through Sites at `https://moonwitness-os.rocksoultech.chatgpt.site`; the deployment contains no CAB route, login storage, or internal operational surface.

## Durable sessions and canonical clients

- Added schema 7 durable session storage for file and PostgreSQL modes, using short-lived signed access tokens and rotating hashed refresh tokens.
- Browser authentication now uses `HttpOnly`, `SameSite` cookies and excludes access/refresh tokens from browser JSON and `localStorage`.
- Added refresh replay rejection, restart-safe logout/revocation, account-wide revocation, strict production origin rejection, route-specific auth limits, and bounded HTTP timeouts.
- Expanded the SDK with login/register/refresh/logout/me lifecycle, one guarded refresh after `401`, runtime response validation, and retries limited to safe or explicitly idempotent operations.
- Migrated and verified the isolated development, staging, and production-simulation PostgreSQL databases at schema 7 with least-privilege application roles.

## Civic Command application family

- Accepted `CIVIC_COMMAND_UI_V1`: restrained government-ready civic sci-fi, with retro/pixel and gamified-authority styling excluded.
- Expanded `@moonwitness/ui` with Solar/Lunar semantic tokens, responsive application shell, localization preference, RID identity plate, boundary/status states, metrics, and causal lanes.
- Added independent `apps/xrp` on port 4175 for the authenticated public RID workspace and `apps/flow` on port 4176 for governed workflow design/history.
- XRP and Flow ship Indonesian and English together, share the secure API session boundary, and remain independently buildable/testable.
- CAB public self-registration was removed; operator accounts must be provisioned and public users are directed to XRP.
- The unified local launcher now starts API, public web, XRP, CAB, and Flow together.
- CAB now consumes the canonical Civic Command shell, RID identity plate, status, locale, theme, dialog, form, and card primitives instead of maintaining a competing application shell.
- Public web now consumes the canonical public header and preference controls and provides complete Indonesian/English landing-page copy with Solar/Lunar support.
- Shared accessibility contracts now cover localized skip navigation, pressed-state controls, dialog semantics, Escape handling, focus restoration, and keyboard-selectable CAB records.
- Added shared governed views for Evidence state, Human Review Gate, Witness integrity, Audit Timeline, and bounded World State snapshots with explicit non-verdict/non-reality wording.
- CAB Case Workflow, Review Queue, and Observatory now compose the governed views instead of presenting competing status grids and raw JSON as their primary interface.
- XRP no longer displays invented sample case/evidence/task totals when no live case is selected; empty state fails neutral as `NOT EVALUATED`.
- Added `MW_XRP_WORKSPACE_V1` and `GET /api/v1/xrp/workspace`: RID comes only from the verified session, same-RID accounts share explicitly stamped records, cross-RID data remains isolated, and evidence payloads/reviewer rationale are excluded from the projection.
- XRP now renders live scoped case selection, evidence state, review gate, work-item counters, and case-linked Witness commitments through the shared governed UI.
- Added credential-free Playwright visual regression with 16 committed baselines covering public web, CAB, XRP, and Flow across Lunar/Solar and desktop/mobile viewports.
- Flow now shows publication as a human-review gate and its Witness commitment as pending until an actual run creates a commitment.
- XRP now provides RID-scoped public creation of cases, observed evidence, work items, and human-review requests. Public users cannot self-verify evidence.
- Flow now persists bounded drafts; a review request creates the Human Review record and a hash-only `MW_FLOW_WITNESS_V1` commitment, while keeping the flow in `REVIEW_REQUIRED`.
- Persisted object reads/writes now enforce RID ownership server-side; cross-RID object access is non-enumerable and tested.
- Updated the Cloudflare Vite toolchain and verified `npm audit` with zero known vulnerabilities.

## Backend boundary closure and RID activation

- Public registration can no longer claim an RID; it creates an unbound `USER` only.
- Added admin-only immutable RID provisioning/binding with durable audit/event evidence and mandatory session revocation after identity-scope changes.
- Admin bootstrap now requires `MOONWITNESS_ADMIN_RID`, is repeat-safe for the same admin/RID, and the three local administrator accounts are RID-bound.
- Production public health is reduced to status/release; kernel, ledger, semantic registry, raw job, model, graph, and detailed dependency state require authority.
- Production observe/analyze/query boundaries now require explicit permissions; job status is requester-scoped and sanitized.
- Added separate auth/AI/write/general rate-limit buckets, validated cookie `SameSite` configuration, and redacted production error details.
- XRP and Flow mutations use actor/operation-scoped idempotency. Concurrent Flow review requests converge on one review and one Witness commitment.
- Flow now persists `WITNESS_PENDING` and review intent before committing the hash-only Q-DAG node, then finalizes with optimistic version checks.
- Reviewer visibility is limited to unassigned reviews or records assigned to that reviewer; assignment removes access from other reviewers.
- Added optimistic compare-and-swap entity updates across memory, file, SQLite, and PostgreSQL providers.
- Formalized the internal repository/data-mapper (ORM-like) boundary: no SQL is allowed in routes or business engines, runtime values are parameterized, and a static contract inventories the six approved database adapters.
- Moved SQLite evidence schema creation into the versioned migration registry and prohibited runtime DDL outside migration-registry bootstrap.
- Re-certified 1,007/1,007 API tests, the complete root regression suite, four production builds, all three PostgreSQL databases/runtime datasets, production preflight, migration contracts, and a zero-vulnerability production dependency audit.
