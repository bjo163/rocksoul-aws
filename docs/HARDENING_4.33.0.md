# Cosmic 4.33.0 — Hardening Acceptance Matrix

This document is the repository-side execution contract for Issue #2 and PR #1.

## P0 — Release integrity

- Canonical release: `4.33.0`.
- Every workspace package must match the canonical release.
- `package-lock.json` must be generated from the same workspace manifests and committed.
- CI must install from the committed lockfile (`npm ci --ignore-scripts`) after lockfile synchronization.
- Runtime witness/AI metadata must never hardcode an older release identifier.

## P1 — Security

- Public authentication endpoints expose stable error codes, not raw internal exception messages.
- Development diagnostics may contain implementation detail; production responses must not.
- Cookie authentication defaults to `SameSite=Lax` and secure cookies in production.
- `SameSite=None` requires an explicitly secure deployment.
- Production JWT configuration must reject the development fallback and weak secrets.
- CORS and trusted-proxy behavior must remain explicit and deny-by-default in production.

## P1 — Provenance

Every AI/witness record should be attributable through:

`caseId → actorId → releaseVersion → analysis → witness node → checkpoint`

System actors are reserved for explicitly system-generated jobs. User-triggered jobs should preserve the authenticated actor identity.

## P1 — Type safety

Critical boundaries must use explicit TypeScript contracts. `any` is permitted only where an adapter is intentionally bridging an untyped legacy boundary and must be narrowed immediately.

## P2 — Test layers

Certification is expected to cover:

1. build
2. unit/regression
3. API
4. contract
5. PostgreSQL integration
6. security/auth boundaries
7. UI/runtime behavior
8. current-release certification

## Merge gate

PR #1 is merge-ready only when the committed source and lockfile produce deterministic CI and every required certification stage is green. Tests must not be weakened or deleted to manufacture a green result.
