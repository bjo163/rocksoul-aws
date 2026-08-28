# Worker Architecture Contract

The current API process contains the persistent job queue and starts job processing during application initialization. A standalone worker is therefore **not** introduced by this document alone.

Before splitting the worker into its own Coolify service, the implementation must establish:

1. a canonical worker entrypoint;
2. `MW_WORKER_ENABLED` or equivalent lifecycle separation so API and worker do not process the same jobs unintentionally;
3. PostgreSQL-backed claim/lock semantics for multi-worker safety;
4. bounded retry/backoff and dead-letter behavior;
5. graceful shutdown that drains or safely requeues in-flight work;
6. queue depth and failure metrics;
7. crash/restart/idempotency regression tests.

Until those conditions are certified, the deployment topology remains API + Web + PostgreSQL and the API's existing queue execution stays the canonical implementation.
