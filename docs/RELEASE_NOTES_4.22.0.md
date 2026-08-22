# MoonWitness OS v4.22.0 — Pure Revelation Asma Refactor

## Purpose

v4.22 removes the legacy human-curated 99-Asma runtime path and replaces it with a scripture-derived Asma subsystem under `src/revelation/asma/`.

## Added

- `src/revelation/asma/types.ts`
- `src/revelation/asma/candidate-miner.ts`
- `src/revelation/asma/relation-miner.ts`
- `src/revelation/asma/semantic-field.ts`
- `src/revelation/asma/asma-engine.ts`
- `src/revelation/asma/index.ts`
- `src/revelation/moral-graph/revelation-moral-graph.ts`
- `src/revelation/moral-graph/index.ts`
- `src/semantic/analytical-vector.ts`
- `docs/ASMA_ENGINE.md`
- `tests/revelation-asma-engine.test.ts`

## Removed

- `src/engines/asma.ts`
- `src/revelation/divine-attribute-discovery.ts` prototype
- `data/asmaul-husna.json`
- `data/asma-semantic-profiles.json`
- legacy seed/runtime requirements for those datasets
- obsolete 99-Asma regression test
- `/api/v1/revelation/divine-attributes`

## API

Added:

```text
GET /api/v1/revelation/asma
GET /api/v1/revelation/moral-graph
```

Retained:

```text
GET /api/v1/revelation/core
GET /api/v1/revelation/geography
```

## Pure Revelation boundary

Asma discovery now uses the admitted revelation corpus directly. The current runtime has the complete bundled Arabic Qur'an reference corpus (6,236 ayahs). Tawrat, Zabur and Injil remain unavailable for normative runtime use until trusted local corpora are provided.

The initial v4.22 extraction protocol finds corpus surface candidates, exact Divine-relation clauses and corpus co-occurrence fields. Candidate count is not a count of Divine Names, and no candidate is automatically promoted to a canonical Name.

## Scoring boundary

RGBL/Mizan scoring remains. The change is that Asma no longer supplies hand-authored numeric identity/profile weights. Generic semantic numeric vectors are explicitly non-normative engineering signals. Asma Engine is upstream ontology discovery; Mizan is downstream analysis/scoring.

The action alias/semantic registry remains as a transitional language/engineering bridge. Its old Asma IDs were removed. It is not normative authority.

## Witness boundary

No peer, consensus or multi-node behavior was introduced. v4.22 retains the single-node Q-DAG/witness architecture unchanged.
