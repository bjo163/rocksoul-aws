# Cosmic Engine — Canonical Documentation

Version: **4.33.0**

Cosmic is an **engine/API-first** repository. It does not own Web, CAB, XRP, Flow, browser UX, accessibility/localization delivery, or product hosting. Those product surfaces belong in host/product repositories and consume versioned Cosmic packages, API contracts, or SDKs.

## Active sources of truth

Read these in order:

1. [`../README.md`](../README.md) — repository purpose and release surface.
2. [`TODO_CURRENT.md`](TODO_CURRENT.md) — current blockers and execution order.
3. [`ENGINEERING_ROADMAP.md`](ENGINEERING_ROADMAP.md) — release progression through 5.0.0.
4. [`PACKAGE_ARCHITECTURE.md`](PACKAGE_ARCHITECTURE.md) — dependency direction and ownership.
5. [`ARCHITECTURE.md`](ARCHITECTURE.md) — runtime and host-adapter boundaries.
6. [`CI_EXECUTION.md`](CI_EXECUTION.md) — exact-SHA CI and branch policy.
7. [`TESTING.md`](TESTING.md) — engine/API/persistence/Witness test model.
8. [`RELEASE_CHECKLIST.md`](RELEASE_CHECKLIST.md) — mandatory release gates.
9. [`RELEASE_STATUS_4.33.0.md`](RELEASE_STATUS_4.33.0.md) — current release status.

## Scope boundary

**Inside Cosmic:** contracts, deterministic/semantic/Mizan/explanation engines, orchestrator, API/reference host adapter, SDK, persistence, jobs/worker, Witness/audit/provenance, security, observability, backend deployment and certification.

**Outside Cosmic:** Web UI, CAB UI, XRP UI, Flow UI, browser presentation state, product accessibility/localization, and product-app hosting/deployment.

`apps/api` is a reference/compatibility host adapter. It is not part of the embedded engine facade, but it remains certified because API, persistence, security, Witness, jobs, and deployment compatibility are supported integration surfaces.

## Historical documentation

Older release notes, UI ADRs, CAB visual/projection documents, `TODO.md`, test reports, and previous status snapshots remain only for audit/history. Historical documents never override the active sources above.
