# Cosmic Engine/API Release Checklist

A release candidate is ready only when all mandatory gates are green on the same SHA.

## Engine/package gate

- [ ] Coding standard / lint
- [ ] Engine TypeScript typecheck
- [ ] Package build and runtime smoke
- [ ] TSE regression and gold tests
- [ ] Semantic / Revelation / Mizan / explanation regressions
- [ ] Orchestrator workflow contracts
- [ ] Package dependency-direction check
- [ ] Engine-only release-scope check

## Reference host / platform gate

- [ ] Application/API TypeScript typecheck
- [ ] Dependency integrity and audit
- [ ] Release identity
- [ ] API/backend contracts
- [ ] SDK/OpenAPI compatibility where applicable
- [ ] Authentication/authorization/idempotency/security contracts
- [ ] Persistence and migration contracts
- [ ] PostgreSQL certification
- [ ] Worker/jobs/Witness/audit/replay contracts
- [ ] API build
- [ ] Final certification
- [ ] Docker image build
- [ ] No unresolved high-severity CI annotations

## Release boundary

The embedded engine surface is centered on `packages/tse-engine`, `packages/cosmic-engine`, the engine packages, and `packages/orchestrator`. `apps/api`, persistence, SDK, jobs, Witness, auth, and deployment code are supported reference-host/integration surfaces and are certified for compatibility.

Web, CAB, XRP, Flow, browser visual regression, product accessibility/localization, and product hosting are not Cosmic release gates.

## Non-negotiable invariants

- astronomical facts are deterministic and activity-neutral;
- unsupported events remain explicit `UNRESOLVED` values;
- hypothesis signals never silently rewrite base temporal facts;
- provenance records provider/algorithm/convention/timezone/quality where relevant;
- analytical scores are not presented as divine reward, punishment, or final judgement;
- production security fails closed;
- logical multi-write mutations are atomic;
- no mandatory release test depends on removed product-app implementation files.

Do not merge a release candidate with a known failing mandatory gate.
