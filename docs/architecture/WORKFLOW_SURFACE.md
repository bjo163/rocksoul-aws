# Cosmic Architecture — Workflow Surface & Ports/Adapters (Phase 9 & 10)

## 1. Overview

Workflows encapsulate multi-step, stateful business lifecycles and transactional operations without coupling to HTTP routers, web frameworks, or specific database drivers.

All workflows live in `@moonwitness/orchestrator` and accept explicit port interfaces.

---

## 2. Standard Workflow Inventory

```
@moonwitness/orchestrator
├── runAnalysisWorkflow()      # Case observation -> AI analysis -> Mizan evaluate -> Witness commit
├── runObservationWorkflow()   # Unbound / bound raw event intake -> Versioned CASE entity
├── runEvaluationWorkflow()    # Direct text/case Mizan evaluation -> Witness envelope commitment
├── runEvidenceWorkflow()      # Immutable evidence attachment -> Versioning -> Supersession checks
├── runReviewWorkflow()        # Human review gate lifecycle (QUEUED -> ASSIGNED -> ACKNOWLEDGED -> DISPOSED)
├── runIngressWorkflow()       # Scheduled and triggered external data ingress
└── replayCaseEvents()         # Deterministic audit replay of aggregate history
```

---

## 3. The Port & Adapter Architecture

Every workflow accepts two arguments:
1. `input`: Typed data payload (e.g. `AnalysisWorkflowInput`).
2. `ports`: Object containing asynchronous side-effect functions (e.g. `AnalysisWorkflowPorts`).

```ts
export interface AnalysisWorkflowPorts {
  loadCase(caseId: string): Promise<{ version?: number } | null>;
  listEvidence(caseId: string): Promise<WorkflowEvidence[]>;
  analyze(input: { text: string; options: WorkflowRecord; semanticObservation?: WorkflowRecord }): Promise<WorkflowRecord>;
  composeReminder?(seed?: number): Promise<unknown>;
  saveCase(input: { aggregate: AnalysisCaseAggregate; eventType: string; actorId: string }): Promise<unknown>;
  commitWitness(input: WitnessCommitInput): Promise<WitnessCommitResult>;
  now?(): Date;
}
```

### Advantages:
- **Testability**: Unit tests mock ports synchronously without spinning up HTTP servers or databases.
- **Portability**: The same workflow runs unchanged in Fastify, AWS Lambda, CLI, or background worker processes.
- **Transaction Safety**: Persistence transactions (e.g. PostgreSQL `BEGIN ... COMMIT` advisory locks) are controlled via the injected store.
