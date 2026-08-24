# MoonWitness OS 4.33.0 — Universe/CAB Architecture Release

**Release line:** 4.33.x  
**Current status:** Release candidate hardening / certification pending

> This document describes the software release boundary. It does not certify a deployment environment by itself.

## What changed

### Canonical Revelation / Knowledge
- Added canonical Scripture Reference, Prophetic Event, Revelation Graph, Evidence/Provenance, Evidence History, Re-analysis Lifecycle, Knowledge Profile, People/Place relation, and Provenance Explorer layers under `packages/revelation`.
- Frozen the distinction between epistemic lane (`CORE`, `DERIVED`, `UNRESOLVED`) and source class.
- Added explicit negative boundaries preventing inferred or AI-generated material from becoming Revelation authority.
- Added deterministic graph, provenance, supersession, and re-analysis contracts with regression coverage.

### CAB Universe
- Added Universe read-model and Observatory projection layers.
- Added Revelation graph drill-down, Event → Passage navigation, Prophet Profile drill-down, Evidence/Provenance surfaces, Review/Witness/Audit rail, uncertainty boundaries, accessibility semantics, and localization parity.
- CAB remains a projection layer; no second semantic engine or new `/universe` API family was introduced.

### API / persistence boundary
- Existing Entity / Relation / Event / Evidence / Case and kernel/Witness surfaces remain the integration boundary.
- Added package-ownership regression guards so `packages/revelation` cannot import back into `src/revelation`.
- Added evidence fingerprinting and re-analysis lifecycle contracts.
- Hardened API route-result typing so response envelopes cannot spread unconstrained `unknown` values.

### Engineering hardening
- Replaced predictable review/case identifiers with UUID-backed identifiers.
- Hardened production JWT and browser-origin boundaries.
- Tightened validator, fiscal-engine, runtime dataset, and engine type boundaries.
- Updated GitHub Actions runtime dependencies to current Node 24-compatible major versions.

### Production certification
- Added executable N1–N6 production certification contracts covering concurrency/idempotency, PostgreSQL/PITR boundaries, rate limits, Witness key custody/rotation, deployment security, and CAB/XRP/Flow separation.
- Added `docs/PRODUCTION_CERTIFICATION.md` as the operational runbook.

## Certification state

Implementation-level code, tests, and documentation are present. CI and target-environment certification remain separate gates and must not be inferred from static contracts alone.

### Current release blockers
1. Run a fresh full CI after the latest API/CI fixes and resolve any new annotations.
2. Complete remaining `src/revelation` physical migration and certify the package boundary.
3. Regenerate the package lockfile with the repository package manager from the actual workspace manifests.
4. Run N1 concurrency/failure drills against the deployment topology.
5. Run N2 PostgreSQL retention/PITR drills against the actual backup/restore environment.
6. Validate N3 distributed rate limiting in the real multi-instance topology.
7. Execute N4 managed key custody/rotation and revocation drills.
8. Execute N5 deployment-specific security/accessibility review.
9. Execute N6 separate CAB/XRP/Flow production certification.

## Release boundary

This release does **not** claim Divine authority, factual truth, or production readiness from software scores or Witness commitments. Witness proves ledger/integrity state, not truth or Divine acceptance.

A green static test suite is necessary but is not sufficient for production certification; the final release requires the environment-specific evidence listed above.
