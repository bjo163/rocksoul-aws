# Cosmic directory ownership

Cosmic is an engine and API runtime. The directory layout below is an ownership
boundary for new code and a migration guide for the remaining compatibility
surface.

## Runtime ownership

- `packages/*/src` contains reusable domain engines, contracts, persistence,
  witness, jobs, orchestration, and SDK code. Package entrypoints must remain
  host-neutral and expose only their public API through `src/index.ts`.
- `apps/api/src` contains HTTP/bootstrap adapters, route registration,
  authentication wiring, telemetry, and job-handler registration. It may depend
  on packages and the compatibility layer, but packages must not depend on it.
- `src/*` is the legacy compatibility layer used by existing scripts and
  regression fixtures. New implementation must not be added here; migrate a
  module to a package before extending it.
- `scripts/*` contains operational and release tooling. Scripts may compose
  package APIs, but should not become a second implementation of an engine.
- `tests/*`, `apps/api/test`, and package `test` directories contain contract
  and regression tests. Tests that exercise the compatibility layer should be
  marked as such and must not establish new package dependencies on `src/*`.

## Generated and local state

Package `dist/`, coverage output, runtime databases, logs, and temporary
directories are generated or local state and are ignored by Git. Do not place
hand-edited source files in those locations.

## Safe migration rule

Keep a legacy shim only while a caller still imports it. A shim should delegate
to the owning package and contain no domain logic. Remove the shim only after
repository-wide import search and the compatibility/regression suites confirm
that no supported caller still uses it.
