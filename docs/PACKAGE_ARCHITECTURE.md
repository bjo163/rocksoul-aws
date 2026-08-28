# Cosmic Package Architecture

Packages are capability boundaries with explicit dependency direction.

```text
@moonwitness/contracts
        ↓
temporal / TSE / semantic / Revelation / Mizan / explanation engines
        ↓
@moonwitness/cosmic-engine
        ↓
@moonwitness/orchestrator
        ↓
host adapters: API / SDK / persistence / Witness / jobs / auth
```

## Rules

1. Engine packages never depend on product UI, HTTP framework implementations, concrete storage, or host auth state.
2. `cosmic-engine` is host-neutral and presentation-agnostic.
3. `orchestrator` composes workflows through injected ports; it does not own HTTP or concrete database behavior.
4. API adapters own transport parsing/authz/idempotency/status mapping, not analytical reasoning.
5. Persistence owns SQL/migrations/storage specifics; business/engine code does not issue SQL.
6. Jobs and Witness remain reusable backend capabilities.
7. SDK exposes supported consumer contracts without importing engine internals.
8. Product-specific Web/CAB/XRP/Flow behavior lives outside Cosmic.
9. Cross-package cycles are rejected.
10. Extract a package only when ownership, public API, dependencies, tests, and reuse value are clear.

## Migration discipline

Move one vertical workflow at a time, add package tests before ownership moves, preserve compatibility aliases when required, and replace cross-root imports only after the destination package owns the implementation.

No package extraction or compatibility cleanup may weaken release evidence.
