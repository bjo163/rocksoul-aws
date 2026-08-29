# Migration status

Completed in this tranche:

- Removed the business-specific adapter from `@moonwitness/workflow`.
- Moved orchestrator workflow definitions and explicit registration to `@moonwitness/orchestrator`.
- Added workflow composition, metadata, retry/dependency fields, and instance executors.
- Added `@moonwitness/intelligence` with explicit context, capabilities, bundles, and direct operations.
- Kept `@moonwitness/cosmic-engine` as a compatibility wrapper; its legacy implicit registration is intentionally retained for existing consumers and should be replaced with explicit engine workflow configuration.
- Added circular dependency and package deep-import guards.

Remaining work: split `apps/api/src/routes/v1.routes.ts` into capability route modules, move its application services into a dedicated application package, and migrate the allowlisted legacy `src/` bridge one owner at a time under the existing contract suite.
