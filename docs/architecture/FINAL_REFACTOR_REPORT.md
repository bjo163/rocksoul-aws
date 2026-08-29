# Cosmic Architecture — Final Refactor Report (Phase 6–10)

## Executive Summary

This report documents the implementation of Phase 6–10 of the Cosmic architecture refactor, focusing on engine facade completion, workflow runtime packageization, and API boundary cleanup.

## Starting Commit

`23a9e37abc247376aaf5a7a7ccbe9f8301366e3f`

## Ending Commit

`a87d6885893034c5d826388f29e85095249e0dba`

## Phase Executed

Phase 6–10: Engine Facade & Capability Packageization

## Files Added

- `packages/workflow/package.json`
- `packages/workflow/src/index.ts`
- `packages/workflow/src/types.ts`
- `packages/workflow/src/registry.ts`
- `packages/workflow/src/executor.ts`
- `packages/workflow/src/orchestrator-adapters.ts`
- `packages/orchestrator/src/ingress/revelation-reminder-engine.ts`
- `packages/orchestrator/src/ingress/divine-ingress.ts`
- `packages/orchestrator/src/ingress/revelation-pattern-engine.ts`
- `packages/orchestrator/src/ingress/revelation-story-engine.ts`
- `packages/orchestrator/src/ingress/quran-narrative-pattern-engine.ts`
- `packages/revelation/src/quran-corpus.ts`
- `packages/revelation/src/asma/types.ts`
- `packages/revelation/src/asma/candidate-miner.ts`
- `packages/revelation/src/asma/asma-engine.ts`

## Files Modified

- `packages/cosmic-engine/package.json`
- `packages/cosmic-engine/src/index.ts`
- `packages/cosmic-engine/test/cosmic-engine.test.ts`
- `packages/orchestrator/package.json`
- `packages/orchestrator/src/index.ts`
- `packages/revelation/src/index.ts`
- `packages/revelation/src/source-policy.ts`
- `scripts/build-packages.mjs`
- `apps/api/src/app.ts`
- `apps/api/src/adapters/jobs/register-job-handlers.ts`
- `apps/api/src/routes/v1.routes.ts`
- `src/ingress/revelation-reminder-engine.ts`
- `src/ingress/divine-ingress.ts`
- `tests/cosmic-engine-integration.test.ts`
- `tests/cosmic-facade-operations.test.ts`
- `tests/ingress/revelation-reminder.test.ts`

## Files Deleted

*(none)*

## Packages Added

- `@moonwitness/workflow` — Host-neutral workflow registry and executor

## Packages Modified

- `@moonwitness/cosmic-engine` — Added workflow execution, real `execute()` implementation
- `@moonwitness/orchestrator` — Added ingress modules (reminder engine, divine-ingress), new dependencies
- `@moonwitness/revelation` — Added asma-engine exports, quran-corpus, source-policy extensions

## Cosmic Engine Changes

- `createCosmicEngine()` is now `async` to register orchestrator workflows on initialization
- `cosmic.execute()` now performs real workflow execution via `@moonwitness/workflow`
- Supports both string-based registered workflow IDs and inline `WorkflowDefinition` objects
- Returns `WorkflowExecutionResult` with status `COMPLETED` or `FAILED`, output, error, and metadata
- Existing `analyze()`, `query()`, `evaluate()`, `explain()` operations remain unchanged

## Workflow Changes

- Created `@moonwitness/workflow` package with:
  - `WorkflowDefinition` interface
  - `InMemoryWorkflowRegistry` with `register`, `get`, `has`, `list`
  - `DefaultWorkflowExecutor` with `execute`
  - Global singleton instances for registry and executor
- Created orchestrator workflow adapters that wrap existing orchestrator implementations:
  - `case-analysis`, `case-observation`, `case-evaluation`
  - `evidence-attachment`, `review-create`, `review-transition`
  - `ai-analysis`, `ingress-schedule`, `ingress-trigger`
- Workflow registration is idempotent (guarded by `hasWorkflow` check)

## Orchestrator Integration

- Migrated reminder engine (`composeReminderBundle`) from root `src/ingress/` to `@moonwitness/orchestrator/src/ingress/`
- Migrated divine-ingress (`createUnpredictableIngress`, `triggerIngress`) from root `src/ingress/` to `@moonwitness/orchestrator/src/ingress/`
- Migrated supporting modules: `revelation-pattern-engine`, `revelation-story-engine`, `quran-narrative-pattern-engine`
- Migrated asma-engine to `@moonwitness/revelation` package with `selectAsmaReminderCandidates` export
- Root `src/ingress/` files now re-export from `@moonwitness/orchestrator` for backward compatibility

## API Changes

- `apps/api/src/app.ts`: Migrated `createUnpredictableIngress`, `triggerIngress` imports from root src to `@moonwitness/orchestrator`
- `apps/api/src/adapters/jobs/register-job-handlers.ts`: Migrated `composeReminderBundle` import from root src to `@moonwitness/orchestrator`
- `apps/api/src/routes/v1.routes.ts`: Migrated `composeReminderBundle`, `createUnpredictableIngress`, `triggerIngress` imports from root src to `@moonwitness/orchestrator`

## Fastify Changes

- Fastify remains the primary HTTP runtime via `apps/api/src/fastify-runtime.ts`
- `apps/api/src/server.ts` conditionally starts Fastify or native HTTP based on `isFastifyEnabled()`
- Custom router (`apps/api/src/router.ts`) remains for native HTTP runtime and Fastify route parity adapter
- No changes to Fastify primary runtime path

## Legacy Import Migration

Before: 10 legacy root-src imports in `apps/api/src`
After: 8 legacy root-src imports in `apps/api/src`

Migrated:
- `src/ingress/revelation-reminder-engine.js` → `@moonwitness/orchestrator` (2 files)
- `src/ingress/divine-ingress.js` → `@moonwitness/orchestrator` (2 files)

Remaining (revelation snapshot functions not yet packageized):
- `src/revelation/revelation-semantic-core.js`
- `src/revelation/revelation-geography.js`
- `src/revelation/asma/asma-engine.js`
- `src/revelation/asma/divine-ontology.js`
- `src/revelation/moral-graph/revelation-moral-graph.js`
- `src/revelation/corpus/four-book-corpus.js`
- `src/revelation/lifecycle/revelation-lifecycle.js`
- `src/revelation/grammar/revelation-grammar.js`

## Reminder Engine Migration

- Reminder engine migrated from `src/ingress/revelation-reminder-engine.ts` to `@moonwitness/orchestrator/src/ingress/revelation-reminder-engine.ts`
- Supporting modules migrated alongside: pattern engine, story engine, quran narrative engine
- Root `src/ingress/revelation-reminder-engine.ts` now re-exports from `@moonwitness/orchestrator`
- All consumers (API routes, job handlers, tests) now import from `@moonwitness/orchestrator`

## Root src Status

| Legacy File | Owner | Reason | Target | Status |
| :--- | :--- | :--- | :--- | :--- |
| `src/ingress/revelation-reminder-engine.ts` | `@moonwitness/orchestrator` | Re-export shim | Remove after all callers verified | Compatibility wrapper |
| `src/ingress/divine-ingress.ts` | `@moonwitness/orchestrator` | Re-export shim | Remove after all callers verified | Compatibility wrapper |
| `src/revelation/revelation-semantic-core.ts` | `@moonwitness/revelation` | Snapshot aggregator | Migrate to revelation package | Remaining |
| `src/revelation/revelation-geography.ts` | `@moonwitness/revelation` | Snapshot function | Migrate to revelation package | Remaining |
| `src/revelation/asma/asma-engine.ts` | `@moonwitness/revelation` | Core asma engine | Partially migrated | Remaining |
| `src/revelation/asma/divine-ontology.ts` | `@moonwitness/revelation` | Ontology snapshot | Migrate to revelation package | Remaining |
| `src/revelation/moral-graph/revelation-moral-graph.ts` | `@moonwitness/revelation` | Moral graph | Migrate to revelation package | Remaining |
| `src/revelation/corpus/four-book-corpus.ts` | `@moonwitness/revelation` | Corpus snapshot | Migrate to revelation package | Remaining |
| `src/revelation/lifecycle/revelation-lifecycle.ts` | `@moonwitness/revelation` | Lifecycle snapshot | Migrate to revelation package | Remaining |
| `src/revelation/grammar/revelation-grammar.ts` | `@moonwitness/revelation` | Grammar snapshot | Migrate to revelation package | Remaining |

## Architecture Verification

- Architecture boundary check: **PASSED**
- Typecheck: **PASSED** (0 errors)
- Lint: **PASSED** (0 escape hatches)
- Package build: **PASSED** (19 packages built)

## Test Results

| Command | Status | Duration | Result |
| :--- | :--- | :--- | :--- |
| `npm run architecture:check` | Passed | ~0.4s | 8 legacy imports (allowlisted 23) |
| `npm run typecheck` | Passed | ~1.8s | 0 errors |
| `npm run lint` | Passed | ~0.6s | 0 escape hatches |
| `npm run build:packages` | Passed | ~5s | 19 packages built |
| `npm run test:orchestrator` | Passed | ~0.2s | 17/17 tests |
| `npm run --workspace @moonwitness/cosmic-engine test` | Passed | ~0.5s | 4/4 tests |
| `npm run test:api-route-inventory` | Passed | ~6.6s | 16/16 tests |
| `npm run test:engine` | Passed | ~15s | All engine tests |
| `npm run test:release` | Partial | ~40s | 3 pre-existing failures in `api-witness-single-node.test.ts` |

### Pre-existing Failures

The following 3 tests in `tests/api-witness-single-node.test.ts` fail on the baseline commit and are **not** caused by this implementation:

1. `evaluation exposes the review gate and commits it to the Witness envelope` — Returns 500 instead of 200
2. `persisted evidence is loaded into subsequent case analysis` — Evidence not found in analysis response
3. `conflicting persisted evidence remains visible to subsequent analysis` — Evidence not found in analysis response

## Regressions

No regressions introduced by this implementation. All pre-existing test failures were verified to exist on the baseline commit `23a9e37`.

## Known Pre-existing Failures

- 3 tests in `tests/api-witness-single-node.test.ts` (documented above)
- 1 test in `tests/cosmic-facade-operations.test.ts` had a pre-existing `as any` lint violation (fixed in this implementation)

## Remaining Technical Debt

1. **Revelation snapshot migration**: 8 root-src imports remain in `apps/api/src/routes/v1.routes.ts`. These depend on complex revelation snapshot aggregators that need full packageization in `@moonwitness/revelation`.
2. **Custom router isolation**: The custom router (`apps/api/src/router.ts`) is still used by the native HTTP runtime. It should be moved to `apps/api/src/compat/` once Fastify is the sole runtime.
3. **Cosmic engine `createCosmicEngine()` async change**: All callers must now `await` the factory. This is a breaking change for direct consumers.

## Breaking Changes

- `createCosmicEngine()` is now `async`. All callers must `await` it.
- `cosmic.execute()` now returns `WorkflowExecutionResult` instead of `{ workflow, status, executedAt, payload }`. The shape is different but the intent is preserved.
- Root `src/ingress/revelation-reminder-engine.ts` and `src/ingress/divine-ingress.ts` now re-export from `@moonwitness/orchestrator`. Internal implementation details are no longer directly accessible from these files.

## Compatibility Notes

- Root `src/` files maintain re-export shims for backward compatibility
- Existing `apps/api` functionality is preserved
- Fastify and native HTTP runtimes both continue to work

## Recommended Next Phase

1. Complete revelation snapshot migration to `@moonwitness/revelation`
2. Move custom router to `apps/api/src/compat/`
3. Migrate remaining root-src imports
4. Establish worker separation per `WORKER_CONTRACT.md`

## Exact Next Worker Task

Continue Phase 11–15: Host Optimization & Fastify Unification. Specifically:
1. Migrate revelation snapshot functions to `@moonwitness/revelation` package
2. Move custom router to `apps/api/src/compat/`
3. Reduce remaining API legacy imports to 0
4. Validate staging Fastify runtime with complete route parity
