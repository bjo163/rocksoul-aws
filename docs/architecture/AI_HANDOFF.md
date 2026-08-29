# AI HANDOFF

CURRENT_BRANCH: dev
CURRENT_COMMIT: 23a9e37abc247376aaf5a7a7ccbe9f8301366e3f (pending new commit)

CURRENT_PHASE: Phase 6–10: Engine Facade & Capability Packageization
PHASE_STATUS: Completed with 3 pre-existing test failures documented

COMPLETED:
- Created `@moonwitness/workflow` package with registry, executor, and orchestrator adapters
- Connected `@moonwitness/cosmic-engine` `execute()` to real workflow execution via workflow registry
- `cosmic.execute('case-analysis', input)` now executes real orchestrator workflows
- `cosmic.execute(workflowDefinition, input)` also supported for inline definitions
- Reminder engine migrated from `src/ingress/` to `@moonwitness/orchestrator/src/ingress/`
- Divine-ingress migrated from `src/ingress/` to `@moonwitness/orchestrator/src/ingress/`
- Asma-engine exports added to `@moonwitness/revelation` package
- API legacy imports reduced from 10 to 8
- `createCosmicEngine()` updated to async (awaitable)
- Consumer smoke test passes (`tests/cosmic-facade-operations.test.ts`)
- Architecture checker passes
- Typecheck passes
- Lint passes

NOT_COMPLETED:
- Remaining 8 legacy API imports (revelation snapshot functions)
- Custom router isolation to `apps/api/src/compat/`
- Full API legacy import migration to 0

COSMIC_ENGINE:
- `analyze`: working, unchanged
- `query`: working, unchanged
- `evaluate`: working, unchanged
- `explain`: working, unchanged
- `execute`: NOW EXECUTES REAL WORKFLOWS via `@moonwitness/workflow` registry
- `createCosmicEngine()`: NOW ASYNC, registers orchestrator workflows on init

WORKFLOW:
- `@moonwitness/workflow` package created with `WorkflowDefinition`, `WorkflowRegistry`, `WorkflowExecutor`
- `InMemoryWorkflowRegistry` with `register`, `get`, `has`, `list`
- `DefaultWorkflowExecutor` with `execute`
- 9 orchestrator workflow adapters registered: case-analysis, case-observation, case-evaluation, evidence-attachment, review-create, review-transition, ai-analysis, ingress-schedule, ingress-trigger
- Registration is idempotent

API:
- Legacy imports: 8 remaining (down from 10)
- Migrated: composeReminderBundle, createUnpredictableIngress, triggerIngress from root src to @moonwitness/orchestrator
- Remaining: revelation snapshot functions (8 imports)

FASTIFY:
- Primary runtime via `apps/api/src/fastify-runtime.ts`
- Custom router still used for native HTTP and Fastify route parity
- No changes to Fastify path

LEGACY_IMPORTS:
- before: 10
- after: 8
- reduction: 2 (reminder engine + divine-ingress)

ROOT_SRC:
- Remaining production runtime: revelation snapshot functions (8 files)
- Compatibility wrappers: revelation-reminder-engine.ts, divine-ingress.ts (re-export shims)

TESTS:
- `npm run test:orchestrator`: 17/17 passed
- `npm run --workspace @moonwitness/cosmic-engine test`: 4/4 passed
- `npm run test:api-route-inventory`: 16/16 passed
- `npm run test:engine`: all passed
- `npm run test:release`: 3 pre-existing failures in api-witness-single-node.test.ts
- `npm run architecture:check`: passed
- `npm run typecheck`: passed
- `npm run lint`: passed

KNOWN_FAILURES:
- 3 pre-existing failures in `tests/api-witness-single-node.test.ts`:
  1. evaluation exposes the review gate and commits it to the Witness envelope
  2. persisted evidence is loaded into subsequent case analysis
  3. conflicting persisted evidence remains visible to subsequent analysis
- These failures exist on the baseline commit and are NOT caused by this implementation

NEXT_WORKER:
- Migrate revelation snapshot functions to @moonwitness/revelation package
- Move custom router to apps/api/src/compat/
- Reduce remaining API legacy imports to 0
- Validate Fastify route parity

READ_FIRST:
- docs/architecture/FINAL_REFACTOR_REPORT.md
- docs/architecture/MIGRATION_PLAN.md
- docs/architecture/WORKFLOW_SURFACE.md
- packages/workflow/src/index.ts
- packages/orchestrator/src/index.ts

EDIT_FIRST:
- packages/revelation/src/index.ts (add snapshot exports)
- apps/api/src/routes/v1.routes.ts (migrate remaining revelation imports)
- apps/api/src/router.ts (move to compat)

DO_NOT_REPEAT:
- Do NOT re-audit architecture (already documented)
- Do NOT recreate workflow package (already exists)
- Do NOT break existing cosmic.analyze/query/evaluate/explain

ACCEPTANCE_CRITERIA:
- Cosmic Engine is a real facade: YES
- cosmic.execute() executes real workflows: YES
- reusable workflow runtime exists: YES (@moonwitness/workflow)
- existing orchestrator workflows are reused: YES
- no duplicate workflow implementation: YES
- API is thinner: PARTIAL (8 imports remaining)
- Fastify is primary HTTP runtime: YES
- custom router is isolated: PARTIAL (still in primary path)
- API legacy imports reduced: YES (10 → 8)
- reminder engine is migrated: YES
- package public APIs are clean: YES
- consumer smoke test works: YES
- architecture checker passes: YES
- typecheck passes: YES
- lint passes: YES
- package tests pass: YES
- relevant API tests pass: YES
- full test suite passes or pre-existing failures documented: YES (3 pre-existing documented)
