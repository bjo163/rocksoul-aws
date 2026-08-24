# Revelation Package Migration

## Ownership rule

`packages/revelation` is the canonical home for Revelation/Knowledge semantic contracts, graph builders, provenance logic, and canonical seed data.

`src/revelation` remains a compatibility/runtime layer while consumers are migrated. The dependency direction is intentionally one-way:

```text
packages/revelation  ← canonical semantic implementation
         ↑
src/revelation       ← compatibility/runtime layer
```

The canonical package MUST NOT import implementation from `src/revelation`.

## Current migration boundary

Already canonical in `packages/revelation/src`:

- Scripture Reference
- Prophetic Event
- Prophet Profile primitives
- Revelation Graph
- Epistemic Boundary
- Evidence / Provenance
- Evidence Graph / Relations / Conflicts
- Evidence History
- Re-analysis Lifecycle
- People / Place relations
- Universe projection

The remaining root modules are treated as runtime compatibility surfaces until their consumers move.

## Guard

`tests/revelation-package-ownership.test.ts` scans the canonical package source tree and fails if a dependency on `src/revelation` is introduced again.

## Exit criteria for G

1. All required semantic modules have canonical implementations in the package.
2. Root imports become compatibility-only adapters.
3. No package-to-root dependency remains.
4. Canonical seed data has exactly one owner.
5. Package ownership and migration boundary tests remain green.
6. PostgreSQL certification confirms installed data remains unchanged by the refactor.
