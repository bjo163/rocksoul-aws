# @moonwitness/revelation

Canonical package boundary for MoonWitness Revelation/Knowledge semantics.

## Responsibilities

- Scripture source policy and corpus access
- Qur'an / four-book corpus handling
- Asma discovery and Divine Ontology
- Revelation Grammar
- Revelation Moral Graph
- Native Revelation Binding
- Prophetic relations and scripture-grounded Prophet graph
- Canonical Prophet profile and scripture-reference normalization
- Canonical prophetic event normalization and Revelation lifecycle / semantic event integration
- Unified Prophet Knowledge Profile projection
- Source-grounded People / Place relation projection
- Pure Revelation graph construction for CAB and other projections
- Canonical evidence/provenance normalization without replacing the shared `EvidenceRecord` contract
- Explicit Evidence ↔ Revelation Graph binding
- Explicit Evidence ↔ Prophet / Event / Passage relations
- Corroboration/conflict graph construction
- CAB Universe read-model projection

## Owned seed data

The package owns the mature Prophet semantic seed used by the Universe model:

- `data/prophets.json` → `REVELATION.PROPHET_PROFILE`
- `data/knowledge/prophet-scripture-index.json` → `KNOWLEDGE.SCRIPTURE_REFERENCE`
- `data/knowledge/prophetic-events.json` → `KNOWLEDGE.PROPHETIC_EVENT`

These sources are seeded into PostgreSQL through the existing persistence bootstrap. No new API family is introduced.

## Canonical H2 event contract

`normalizePropheticEvents()` converts canonical event seed records into a stable semantic contract. An event with one or more Qur'an references is grounded as `QURAN_EXPLICIT`; an event without such references remains `UNRESOLVED`. The normalizer never infers chronology, external corroboration, or divine authority.

## Canonical H3 graph contract

`buildRevelationGraph()` is a pure graph builder. It composes canonical book, surah, passage, prophet, scripture-reference, and prophetic-event nodes plus explicitly grounded relations. It does not perform API calls, persistence writes, chronology inference, or Divine judgement. `CORE`, `DERIVED`, and `UNRESOLVED` lanes are preserved through the graph.

## H4 integrity guarantees

The graph contract requires deterministic node/relation ordering, unique relation IDs, stable lane propagation, and explicit negative boundaries: unresolved data cannot be promoted to core, chronology is never inferred, non-scriptural evidence is never promoted, and a Prophet is never represented as Divine Ontology. Unknown grounding is neutralized to `UNRESOLVED` rather than being trusted as a new semantic class.

## Canonical L1–L3 knowledge contracts

`normalizeProphetProfiles()`, `normalizeScriptureReferences()`, and `normalizePropheticEvents()` remain pure canonical normalizers. `buildProphetKnowledgeProfiles()` is a read-model projection that joins those three contracts without creating a second persistence model. A Prophet profile is represented as a person identity plus a `PROPHET_REFERENCE` role/context; scripture references and prophetic events remain independently traceable. Any unresolved scripture reference or event keeps the combined profile visibly `UNRESOLVED`. Source class remains `REVELATION`, while uncertainty stays orthogonal to source origin.

## Canonical L4 people/place contract

`buildPeoplePlaceRelations()` is a projection-only relation builder over already-grounded passage/event context. It emits `OCCURS_AT` for explicit place references and `INVOLVES` for explicit people references. It deduplicates and deterministically orders references, never fabricates a Person/Place entity, and never treats an inferred relation as revelation: canonical source context is `CORE + REVELATION`; projection-derived context is `DERIVED + INFERENCE`.

## Canonical I1 evidence contract

`normalizeEvidenceProvenance()` enriches the existing shared `EvidenceRecord` with semantic class, grounding, normative-authority and provenance flags. Qur'an explicit evidence can carry normative authority; textual-witness corroboration is confidence-only and never equals original revelation; observed records remain observations; inferred/engine/AI evidence remains derived; conflicted records remain conflicted. Confidence is clamped to `0..1`, and superseded evidence remains part of history.

## Canonical I2 graph-binding contract

`bindEvidenceToRevelationGraph()` creates deterministic evidence bindings only when an evidence reference resolves to an existing Revelation graph passage. Binding is representational: it does not mutate graph lanes, elevate unresolved/corroborative/observational evidence into revelation authority, or create a new semantic source. Qur'an-explicit evidence may remain `CORE` with `normativeAuthority=true`; corroborative, observed, derived, and conflicted evidence remain non-normative. Unresolvable references produce no binding rather than a fabricated node.

## Canonical I3 explicit relation contract

`buildExplicitEvidenceRelations()` emits deterministic typed relations from Evidence to canonical `PASSAGE`, `PROPHET_REFERENCE`, and `PROPHETIC_EVENT` targets. Qur'an-explicit evidence supports a target; textual witnesses corroborate; observations observe events; inferred/engine/AI evidence remains derived; conflicts remain conflicts. Unsupported target kinds or unknown evidence grounding produce no relation. These relations never mutate the target graph or promote its epistemic lane.

## Canonical I4 conflict/corroboration graph

`buildEvidenceConflictGraph()` links active evidence records that point at the same explicit reference. Textual-witness corroboration creates `CORROBORATES`; conflicted evidence creates `CONFLICTS_WITH`. Superseded evidence is excluded from the active graph but remains historical evidence. The graph is deterministic and symmetric; observation/inference alone does not manufacture corroboration or conflict.

## Canonical J1 CAB Universe projection

`buildUniverseProjection()` is a pure read-model constructor over existing Entity, Relation, Event, Evidence, Case, and Revelation Graph inputs. It produces the `CAB_UNIVERSE_READ_V1` summary for WORLD, REVELATION, KNOWLEDGE, and GOVERNANCE. It adds no API family and does not mutate source records.

## Boundary

This package does not issue Divine verdicts, infer unsupported chronology, or promote derived concepts into canonical revelation authority.

## Migration

The semantic implementation is still migrated incrementally from `src/revelation`; package-owned seed data is now canonical. Mature implementation modules move here only after build and certification gates pass.

Package code must remain host-neutral: it may depend on contracts and capability packages, but must not import `apps/api`, HTTP route/bootstrap modules, or web-server frameworks. `npm run architecture:check` enforces this boundary for all package source files.
