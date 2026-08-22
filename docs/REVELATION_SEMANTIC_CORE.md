# Revelation Semantic Core v4.27

## Canonical source policy

Normative reasoning admits only four revelation categories:

1. Al-Qur'an — primary / Muhaimin.
2. Tawrat — bundled transmitted textual witness; corroboration only.
3. Zabur — bundled transmitted textual witness; corroboration only.
4. Injil — bundled transmitted textual witness; corroboration only.

External history, hadith, tafsir, scholarly interpretation, medical/legal material, news and web research have zero normative weight in this core. Missing revelation corpora are not synthesized from model memory.

## Runtime corpus state

```text
QURAN   AVAILABLE_CANONICAL_REFERENCE — 6,236 Arabic ayahs
TAWRAT  AVAILABLE_TEXTUAL_WITNESS_CORPUS — 5,852 Pentateuch records
ZABUR   AVAILABLE_TEXTUAL_WITNESS_CORPUS — 2,461 Psalm records
INJIL   AVAILABLE_TEXTUAL_WITNESS_CORPUS — 3,779 four-Gospel records
```

Qur'an remains the primary normative/Muhaimin runtime corpus. The other three local corpora are active **textual-witness corroboration channels** with equal channel weight; they may raise confidence when sufficiently matched but cannot create/reverse moral direction or be equated with original revelation.

## Core composition

```text
src/revelation/
├─ quran-corpus.ts
├─ scripture-source-policy.ts
├─ revelation-geography.ts
├─ asma/
│  ├─ candidate-miner.ts
│  ├─ relation-miner.ts
│  ├─ semantic-field.ts
│  └─ asma-engine.ts
├─ moral-graph/
│  └─ revelation-moral-graph.ts
└─ revelation-semantic-core.ts
```

## Pure Revelation Asma

v4.22 removes the old 99-name runtime catalog and semantic-profile dataset completely. Asma is now discovered from revelation text itself. Surface candidates, explicit Divine relations and co-occurrence fields all retain exact passage provenance. See `ASMA_ENGINE.md`.

The core never treats the discovery candidate count as a theological count of Names and never treats proximity to the token Allah as sufficient proof that a phrase is a canonical Name.

## Revelation Moral Graph

The moral graph is built from explicit scriptural Divine relations before human-action scoring. Its purpose is to produce traceable moral primitives/relations that RGBL and Mizan can later consume.

```text
REVELATION
   ↓
ASMA / DIVINE RELATIONS
   ↓
REVELATION MORAL GRAPH
   ↓
EVENT INTERPRETER
   ↓
RGBL
   ↓
13 OUT
   ↓
MIZAN SCORING
```

The current action alias/semantic registry remains only a language/engineering bridge. It no longer contains Asma IDs and has `normativeAuthority=false` in runtime interpretation.

## Geography boundary

The engine continues to separate:

- `placeMention`
- `revelationLocation`
- `semanticFunction`

A passage mentioning Makkah or al-Madinah does not prove that the passage was revealed there. External Makki/Madani chronology is not imported into normative reasoning.

The earlier v4.21 Makkah/Madinah research remains `RESEARCH_ONLY`: useful for hypothesis testing, never an automatic moral rule.

## Core invariants

```text
fourBooksOnly = true
quranPrimaryMuhaimin = true
externalNormativeWeight = 0
canonical99IsSourceOfTruth = false
asmaMustBeDiscoveredFromRevelation = true
actionSpecificMoralScoreMayBeHardcoded = false
researchHypothesisMayBecomeNormativeRuleAutomatically = false
unavailableCorpusMayBeInvented = false
```


## v4.24 seeded corpus runtime

All four admitted channels now have local full-text data available to the runtime: Qur'an as canonical primary reference and Tawrat/Zabur/Injil as transmitted textual witnesses. Installation persists every passage as a typed entity and PostgreSQL runtime initialization reconstructs the corresponding corpus arrays from those rows. The source-policy hierarchy is unchanged by availability: witness text is corroborative only and cannot outvote the Qur'an.

## Semantic Event Interpreter (v4.27)

The four-book core is now preceded by `src/events/`. This layer extracts event sequence, negation, report status, knowledge/context signals, permission, mistake/coercion, and restoration before invoking Native Revelation Binding. It is explicitly non-normative. Its seeded profile is pinned by `REVELATION-INDEX::EVENT-INTERPRETER`. See `SEMANTIC_EVENT_INTERPRETER.md`.

## v4.28 Moral Lifecycle

The four-book core now includes a lifecycle grounding layer after event interpretation. Quran remains primary/Muhaimin; witness corpora corroborate confidence only. Lifecycle stages are analytical temporal relations and never become a claim that repentance or forgiveness was accepted by Allah.

## v4.29 Grammar-first relation extraction

Asma explicit relation extraction and Qur'an passage-direction analysis now consume `src/revelation/grammar/` frames. This preserves negation and coordinated predicates before moral interpretation. Grammar remains non-normative, and canonical Arabic roots/lemmas are not claimed.


## v4.30 Divine Ontology

The Semantic Core now exposes a dedicated `divineOntology` snapshot downstream of Grammar and Asma extraction. It organizes corpus-attested Divine-reference surfaces and explicit Divine relations into strict context clusters, polarity families and relation-target concepts. The ontology cannot auto-promote a canonical Name/Attribute and cannot create moral authority independent of explicit Revelation evidence.
