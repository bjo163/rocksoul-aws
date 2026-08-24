# @moonwitness/kernel

Canonical package boundary for the MoonWitness universal kernel/domain layer.

## Responsibilities

- Entity/Event/State/Relation primitives
- RID and versioning boundaries
- Core state/rule/relationship utilities
- Domain type registration
- Model Registry / UI model metadata

## Boundary

The kernel does not own HTTP routes, CAB screens, XRP presentation, or PostgreSQL implementation details. Those belong to applications/adapters and existing packages.

## Migration

v4.32 introduces the package boundary as a compatibility facade. Mature modules will move from `src/core` and the backend model layer here incrementally, with import-boundary and certification checks after each move.
