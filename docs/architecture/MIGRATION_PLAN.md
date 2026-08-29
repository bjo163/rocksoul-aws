# Cosmic Master Migration Plan — Execution Roadmap

## Phase 0: Baseline Quality & CI Verification (COMPLETED)
- [x] Run `npm run typecheck` across all projects.
- [x] Run `npm run architecture:check` boundary audits.
- [x] Run `npm run lint` coding-standard zero-any checks.
- [x] Run `npm run test:diagnostic` engine diagnostic report.
- [x] Run `npm test` & `npm run test:release` full test harness (1,007 tests passing).

## Phase 1–5: Architecture Audit, Inventory & Topology (COMPLETED)
- [x] Create `docs/architecture/CURRENT_ARCHITECTURE.md`.
- [x] Create `docs/architecture/PACKAGE_OWNERSHIP_MAP.md`.
- [x] Create `docs/architecture/DEPENDENCY_GRAPH.md`.
- [x] Create `docs/architecture/API_SURFACE.md`.
- [x] Create `docs/architecture/WORKFLOW_SURFACE.md`.
- [x] Create `docs/architecture/LEGACY_SURFACE.md`.
- [x] Create `docs/architecture/package-map.json`.
- [x] Create `docs/architecture/dependency-graph.json`.

## Phase 6–10: Engine Facade & Capability Packageization (COMPLETED)
- [x] Complete 18 workspace packages setup (`@moonwitness/*`).
- [x] Connect unified operations (`analyze`, `query`, `evaluate`, `explain`, `execute`) in `@moonwitness/cosmic-engine`.
- [x] Migrate reminder engine into `@moonwitness/orchestrator` / `@moonwitness/revelation`.
- [x] Reduce legacy imports in `apps/api` to 8 (from 10).

## Phase 11–15: Host Optimization & Fastify Unification (COMPLETED)
- [x] Align `apps/api` strictly as a thin consumer of `@moonwitness/*` packages.
- [x] Validate staging Fastify runtime with complete route parity.
- [x] Migrate all revelation snapshot functions to `@moonwitness/revelation` package.
- [x] Reduce API legacy root-src imports to 0.
- [x] Isolate custom router to `apps/api/src/compat/router.ts`.

## Phase 16–24: Verification, Benchmarking, Documentation & Sign-Off
- [ ] Run diagnostic benchmark and verify Mizan throughput (>50k ops/sec).
- [ ] Produce final markdown summary `docs/architecture/FINAL_REFACTOR_REPORT.md`.
