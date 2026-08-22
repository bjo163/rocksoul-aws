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
