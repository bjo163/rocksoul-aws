# Package boundaries

Cosmic is organized as a dependency-directed workspace. `contracts`, `kernel`, and host-neutral capability packages are reusable libraries. `workflow` provides only generic definitions, registries, executors, composition, and lifecycle metadata. `orchestrator` owns Moonwitness business workflows and ports. `intelligence` is the reusable facade; `cosmic-engine` remains a compatibility facade. `persistence`, `jobs`, `observability`, `security`, and API code are adapters/runtime concerns.

Public entrypoints are package root exports. Packages are currently workspace-private until release policy and versioned compatibility are finalized; this does not prevent independent workspace consumption through their explicit exports.
