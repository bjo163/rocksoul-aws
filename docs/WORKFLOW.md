# Workflow model

`@moonwitness/workflow` is business-neutral. Define workflows with `defineWorkflow`, register them on an application-owned `InMemoryWorkflowRegistry`, and execute them with an instance executor. `composeWorkflows` creates a reusable sequential definition. Business definitions such as analysis, evidence, review, and ingress are exported by `@moonwitness/orchestrator` and installed only through the explicit `registerOrchestratorWorkflows(registry)` call.

The legacy global registry/executor remain compatibility APIs. New engine instances own their registry and executor path.
