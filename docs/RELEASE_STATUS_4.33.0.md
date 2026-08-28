# Cosmic — Release Status 4.33.0

**Date:** 2026-08-28  
**Release line:** 4.33.x  
**Current posture:** engine/API release certification in progress

## Canonical spine

```text
Temporal / TSE
      ↓
Semantic / Event
      ↓
Evidence / Revelation
      ↓
Mizan
      ↓
Bounded Explanation
      ↓
Cosmic Engine
      ↓
Orchestrator
      ↓
API / Persistence / Jobs / Witness host adapters
```

## Scope

Cosmic has no product frontend application. Web/CAB/XRP/Flow are external product surfaces. `apps/api` remains a reference/compatibility host adapter and is certified together with persistence, security, jobs, Witness, PostgreSQL, and deployment contracts.

## Current release truth

- Release identity stale CAB workspace dependency (#78) is resolved.
- The earlier full release gate reached release-focused tests and then failed because a stale product-app contract read a removed CAB API helper.
- Issue #94 is resolved: release contracts now assert backend/API boundaries directly and include a regression guard against removed product-app dependencies.
- Fastify transition work is separate (#88–#93) and must preserve native API semantics until parity is certified.
- Fresh exact-SHA certification is required after every release-affecting change.

## Required gates

| Gate | Requirement |
|---|---|
| Scope/docs/architecture | engine-only boundaries consistent and guarded |
| Dependencies | integrity and audit pass |
| Packages | build/runtime contracts pass |
| Type safety | lint and typecheck pass |
| Release identity | current workspace/version contract passes |
| Release tests | backend/engine/platform contracts pass with no removed UI dependency |
| PostgreSQL | live certification passes |
| API | build and supported compatibility tests pass |
| Final certification | current release checks pass |
| Docker | exact-SHA image build passes |

## Certification rule

`implemented` means source/test/docs contract exists. `certified` requires the complete mandatory gate on the exact candidate SHA plus any required environment evidence. Historical, partial, cancelled, queued, or different-SHA results are not release evidence.

No production tag should be created while a mandatory gate is failing, skipped because of an upstream failure, or only inferred from historical evidence.
