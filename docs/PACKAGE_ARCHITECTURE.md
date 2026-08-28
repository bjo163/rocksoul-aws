# Cosmic Package Architecture

Cosmic is organized around dependency direction rather than source-folder
names. A package is created only for a stable capability with a clear owner;
individual utility folders must not become packages by default.

```text
@moonwitness/contracts
        ↓
temporal / semantic / Mizan / Revelation / explanation engines
        ↓
@moonwitness/cosmic-engine
        ↓
@moonwitness/orchestrator
        ↓
host adapters (API, persistence, witness, auth, jobs)
```

## Current package roles

| Package | Responsibility | Must not depend on |
| --- | --- | --- |
| `contracts` | Public DTOs, protocol versions, ports, validation | API, persistence, UI |
| `tse-engine` | Deterministic temporal facts and research signals | HTTP, auth, persistence |
| `cosmic-engine` | Host-neutral engine facade | HTTP, concrete storage, user state |
| `orchestrator` | Reusable workflows using injected ports | HTTP, concrete storage, auth implementation |
| `revelation` | Canonical corpus and knowledge boundary | UI |
| `persistence` / `data-access` | Storage and projections | API presentation |
| `sdk` | Consumer-facing client contract | internal engine implementation |

## Orchestrator boundary

The current workflows are `runAnalysisWorkflow`, `runObservationWorkflow`,
`runEvaluationWorkflow`, `runAiAnalyzeWorkflow`, the evidence/review
workflows, and ingress schedule/trigger workflows. They receive ports for loading state, running an
engine analysis, saving a CASE, appending an event, and committing a Witness
record where required. Evaluation also validates the human-review gate before
any persistence side effect; ingress workflows enforce idempotent scheduling
and one-time triggering. This lets the reference API and Moonwitness use
the identical workflows with different adapters.

The HTTP adapter remains responsible for request parsing, authentication,
authorization, idempotency keys, and HTTP status mapping. It must not contain
analysis, evidence composition, aggregate construction, or Witness workflow
logic.

## Migration rules

1. Extract one vertical workflow at a time, preserving existing route paths as
   compatibility aliases.
2. Add a package test before moving a route handler.
3. Replace cross-root imports with package imports only after the package owns
   the implementation.
4. Do not move product-specific XRP/Flow/UI behavior into `cosmic-engine`.
5. Reject dependency cycles; packages may only depend downward in the diagram.

## Next migrations

1. Evidence and review workflows.
2. Jobs and ingress workflow adapters.
3. Split the remaining semantic, Mizan, and explanation internals out of root
   `src/` into their dedicated engine packages.
