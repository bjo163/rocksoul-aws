# Application runtime

`@moonwitness/application` owns coordination across intelligence, workflows, and injected infrastructure ports. `createApplicationServices` adapts persistence/witness/provider ports to the business workflows. `createApplicationRuntime` combines those services with an `IntelligenceEngine` and a workflow registry.

The API bootstrap is a composition root: it loads configuration, creates infrastructure adapters, injects them into application services, and exposes the resulting runtime through `RouteContext`. HTTP routes do not construct stores, witness DAGs, providers, or workflow ports. The same application runtime can be hosted by a CLI, worker, or test harness.
