# Pure Revelation Asma Engine — v4.30

## Decision

The active Asma engine is **not** the historical 99-name catalog. The repository no longer ships or reads `data/asmaul-husna.json`, `data/asma-semantic-profiles.json`, or `src/engines/asma.ts`.

The canonical implementation lives under:

```text
src/revelation/asma/
├─ types.ts
├─ candidate-miner.ts
├─ relation-miner.ts
├─ semantic-field.ts
├─ divine-ontology.ts
├─ asma-engine.ts
└─ index.ts
```

The engine reads only corpora admitted by `scripture-source-policy.ts`. The Qur'an Arabic corpus is the active primary/Muhaimin mining corpus. v4.23 also bundles Tawrat, Zabur and Injil transmitted textual-witness corpora for **corroboration only**. They are not silently promoted to original revelation or primary normative authority; their current Asma role is corroborative text availability, while Quran remains the active Asma-mining core.

## Pipeline

```text
FOUR-BOOK SOURCE POLICY
        ↓
AVAILABLE REVELATION CORPUS
        ↓
DIVINE-REFERENCE SURFACE MINING
        ↓
EXPLICIT DIVINE RELATION MINING
        ↓
CORPUS COOCCURRENCE FIELDS
        ↓
DEEP DIVINE ONTOLOGY
        ├── surface concepts
        ├── strict context clusters
        ├── relation families
        └── relation-target concepts
        ↓
REVELATION MORAL GRAPH
        ↓
RGBL / MIZAN (separate layer)
```

Asma Engine does **not** score human actions and does not issue verdicts. It discovers scriptural structures that later analysis layers may use.

## Candidate boundary

`mineAsmaCandidates()` currently finds corpus-derived surface candidates around explicit Divine references and conservative same-ayah pronoun frames. A candidate is one of:

- `NAME_ATTRIBUTE_SURFACE`
- `DIVINE_PREDICATE_SURFACE`
- `DIVINE_ACTION_SURFACE`
- `PRONOUN_FRAME_SURFACE`

Statuses are deliberately limited to:

- `SCRIPTURE_ATTESTED`
- `CORROBORATED_SURFACE_CANDIDATE`

There is no automatic `CANONICAL_NAME` promotion. Repetition proves repeated surface attestation, not that human software has completed theological classification.

## Explicit relation mining

The first explicit-relation protocol extracts directly attested Qur'anic surface relations such as:

- Allah loves ...
- Allah does not love ...
- Allah commands ...
- Allah forbids ...
- Allah forgives ...
- Allah guides ...
- Allah knows ...
- Allah judges ...

Each edge retains the Arabic predicate surface, target surface, exact ayah, full ayah text, and grounding class. Relation labels are machine structural labels; the evidence is always the passage itself.

## Semantic fields

A candidate semantic field is produced from token co-occurrence across the candidate's own scripture references. No external dictionary, 99-name definition file, tafsir, web source, or manually assigned moral family is used.

```text
candidate
   ↓
its scripture occurrences
   ↓
context token frequency
   ↓
CORPUS_COOCCURRENCE_ONLY field
```

This is an initial lexical field, not a complete Arabic morphology/semantics engine. The small verb-prefix and frame recognizers used by the miners are extraction grammar only: they classify textual shapes and carry no moral score or theological authority.

## Moral graph boundary

`src/revelation/moral-graph/revelation-moral-graph.ts` maps explicit Divine relations into RGBL inspection lanes:

- approval/command → GREEN candidate lane
- rejection/prohibition → RED candidate lane
- knowledge/guidance/judgement → BLUE candidate lane
- forgiveness → LIGHT candidate lane

That mapping is explicitly marked **engineering interpretation**. The scriptural relation is primary evidence; RGBL is the MoonWitness analytical lens. No action-specific Divine score is hardcoded.

## Non-negotiable invariants

```text
canonical99Hardcoded = false
humanCuratedNameListUsed = false
externalLexiconUsed = false
externalNormativeSourceUsed = false
candidateEqualsCanonicalName = false
unavailableCorpusMayBeSynthesized = false
actionSpecificMoralScoreHardcoded = false
finalDivineJudgmentComputed = false
```

## Current measured corpus output

On the bundled 6,236-ayah Qur'an corpus, v4.30 retains 1,754 raw surface candidates and 143 grammar-derived explicit Divine relations. The Deep Divine Ontology consolidates those surfaces into 1,751 exact surface concepts, including 328 concepts corroborated across multiple ayah references, plus 102 explicit relation-target concepts and 7 polarity-preserving relation families. **None of these counts is a count of Divine Names.**


## v4.24 installation index

After typed corpus seed, installation persists a reproducible Asma derived-index snapshot tied to the four-corpus fingerprint. The active Asma miner remains Qur'an-first/pure-Revelation and does not treat textual-witness availability as permission to promote transmitted wording into canonical Divine Names. The index is an acceleration/audit artifact, not a new authority source.

## Relationship to Native Revelation Binding

Asma Engine remains a separate upstream discovery system. It does not classify the user's action and does not assign action scores. Native Revelation Binding may consume the Revelation Moral Graph and retrieved passage structure, but no Asma candidate is itself treated as a moral verdict. This preserves the separation: **Asma discovers Divine ontology; Revelation binding grounds action direction; RGBL/Mizan weighs and scores downstream.**


## v4.27 event boundary

The Semantic Event Interpreter is downstream from language parsing and separate from Asma discovery. It cannot promote an Asma candidate, alter a Divine relation, or use an Asma surface as an action verdict. Asma remains Revelation ontology; event interpretation determines what human event is being claimed before the moral graph is consulted.

## v4.29 Grammar integration

The Asma relation miner no longer owns a parallel token-neighbor grammar. It consumes the Revelation Grammar Engine. `DOES_NOT_COMMAND`, `DOES_NOT_FORGIVE`, and `DOES_NOT_GUIDE` are distinct relations, preventing negation from being lost. Surface candidates still are not automatically canonical Names/Attributes.


## v4.30 Deep Divine Ontology

Asma Engine v2 now exposes `divineOntology`, built only from scripture-attested surface concepts, grammar-derived explicit Divine relations, strict corpus-context clustering, polarity-preserving relation families, and explicit relation-target concepts. The current corpus snapshot yields 1,751 surface concepts, 328 corroborated concepts, 3 strict context clusters, 7 relation families, 102 relation-target concepts and 143 explicit Divine relations. None of these counts is a count of the Names of Allah.

The ontology profile is engineering-only (`normativeAuthority=false`). Clustering cannot create a canonical Name, Attribute, command, prohibition, reward or moral score. See `DIVINE_ONTOLOGY_ENGINE.md`.
