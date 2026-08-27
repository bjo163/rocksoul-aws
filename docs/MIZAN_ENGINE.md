# Cosmic Mizan Engine

Cosmic is the engine/API layer consumed by MoonWitness. Mizan remains the existing calculation engine; this document defines the stable boundary around it.

## Layers

```text
MoonWitness / external client
        |
        v
Cosmic API
        |
        v
Analysis / Semantic layer
        |
        v
Mizan Service Boundary
        |
        v
src/engines/mizan.ts   <-- single source of truth for scoring
        |
        +--> RGBL / gates / impact / time / causality / domain / scale
        +--> confidence / responsibility / trace
```

## Contract

`src/contracts/mizan.ts` defines `MizanInput` and `MizanResult`. Consumers should depend on this contract rather than importing implementation details from the scoring engine.

`src/services/mizan-service.ts` is a deliberately thin adapter. It does not duplicate or reinterpret the formula in `src/engines/mizan.ts`.

## Full analysis vs direct evaluation

Full analysis remains the existing `/api/v1/analyze` flow. It can build semantic observations, collect evidence, run Mizan and downstream Revelation/review/provenance logic, persist the case, and commit a witness record.

The direct Mizan endpoint is now active:

```text
POST /api/v1/mizan
        |
        v
require EVALUATE permission
        |
        v
validate MizanInput
        |
        v
evaluateMizanService()
        |
        v
MizanResult + meta
```

The direct endpoint is intentionally separate from full case orchestration so MoonWitness can use Mizan as a reusable engine without invoking the entire analysis pipeline.

## Data-driven semantic boundary

Semantic language is runtime data, not source-code vocabulary. `data/events/event-language-profile.json` owns lexical signals, context phrases, structural action mappings, action groups, source terms, and other language rules consumed by the semantic and event parsers. `data/ai/concept-aliases.json` and the semantic registry remain the action/entity vocabulary sources.

`src/ai/semantic-engine.ts` and `src/events/event-parser.ts` perform matching, normalization, parsing, and composition against those datasets; they must not embed domain-specific lexical lists or action policy mappings. The regression suite includes `tests/semantic-no-hardcode.test.ts` to guard this boundary and `tests/semantic-mizan-matrix.test.ts` to exercise contextual cases from semantic extraction through Mizan evaluation.

## Persistence

PostgreSQL and witness/provenance persistence remain part of Cosmic. Removing frontend applications does not remove state needed for evidence, events, entities, auditability, and witness chains.

## Design rule

Do not hard-code domain-specific moral scores into the Mizan formula. Domain semantics should arrive through semantic observations, evidence, profiles, and rules. Mizan performs the weighting/balance calculation and returns traceable output.
