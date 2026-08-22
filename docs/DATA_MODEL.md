# Universe OS — Canonical Data Model

## Core entities

```text
Entity
Event
State
Relation
Observation
Evidence
Case
Decision
AuditRecord
Job
Actor
IdempotencyRecord
```

## Case aggregate

A case is the persistent spine for analysis:

```text
CASE
├─ entities
├─ observations
├─ events
├─ semantic
├─ rgbl
├─ actionGates
├─ impacts
├─ time
├─ causality
├─ evidence
├─ mizan
├─ lifecycle
└─ audit
```

## Record metadata

All mutable persistent records should support Odoo-like metadata:

```text
createdAt
createdBy
updatedAt
updatedBy
version
```

Actor identities include human, bot, AI, system, service, and process classes.

## Event ledger

Events are append-oriented and linked by `previousHash`/`eventHash`. Audit verification uses a separate immutable hash chain over actor, operation, before/after, and changed-field metadata. Both chains are verified after recovery.

## Idempotency

Commands may carry an idempotency key. The persisted record binds that key to a request hash, response status, and response body. Reusing a key with the same payload returns the original result; reusing it with a different payload fails closed.

## Recovery model

The file provider supports restart/reload and checksum-manifest backup/restore. Restore is intentionally directed to a new or empty target directory so a verified backup cannot silently overwrite an active store.

## Witness projection and local custody model — retained through v4.20

Migration `0005_distributed_witness_projection` provides `witness_nodes`, `witness_checkpoints`, and `witness_keys`. In v4.20 the tables remain public/query projections; this retains the v4.19 single-node baseline. The canonical one-node witness ledger is `<MOONWITNESS_DATA_DIR>/witness/qdag.json`. Private key custody lives only in the encrypted single-node keystore under the runtime data directory. `witness_keys` stores public lifecycle metadata (`ACTIVE`, `SUPERSEDED`, `REVOKED`); `witness_checkpoints` mirrors locally signed 1-of-1 checkpoints when PostgreSQL is enabled. No schema migration beyond v5 is required for v4.20.


### Mizan witness node (`MW-MIZAN-WITNESS-V1`)

The Q-DAG payload records `recordId`, `recordType`, source/model metadata, `inputHash`, `mizanHash`, `semanticHash`, `lifecycleHash`, and `resultHash`. It deliberately omits raw input text and full readable analysis payloads. No PostgreSQL schema migration beyond v5 is required for v4.20.

## Qur'anic Mizan analytical record — v4.20

```text
QuranicMizan
├─ protocol / version
├─ status
├─ epistemic
│  ├─ evidenceState
│  ├─ verificationRequired
│  ├─ actionConfidence
│  └─ sourceGrounding
├─ quranGrounding
│  ├─ coverage
│  ├─ refs[]
│  └─ empiricalRequired
├─ intention
│  ├─ state
│  ├─ confidence
│  └─ heartKnown=false
├─ responsibility
│  ├─ coercion
│  ├─ mistake
│  ├─ capacityLimited
│  ├─ factor
│  └─ burdenTransferAllowed=false
├─ balance
│  ├─ impactClass
│  ├─ harmSignal
│  ├─ benefitSignal
│  ├─ retainBothChannels=true
│  ├─ engineeringNetIsDivineCancellationRule=false
│  └─ numericBoundary
├─ principlesApplied[]
└─ reserved
```

The structure deliberately separates normative Qur'an references, factual evidence state, inference, engineering numerics, and unseen/final boundaries.


## v4.21 Four-book Revelation Core

Normative reasoning is restricted to Al-Qur'an, Tawrat, Zabur, and Injil, with Al-Qur'an primary/Muhaimin. External research and historical metadata cannot contribute normative weight. The engine distinguishes scripture text from metadata and distinguishes a place mentioned in a passage from the place where that passage was revealed. Tawrat/Zabur/Injil transmitted textual-witness corpora are now bundled and seeded for corroboration only; they are not equated with the original revealed texts and cannot establish or reverse primary moral direction. See `REVELATION_SEMANTIC_CORE.md`.

## v4.22 Revelation/Asma data model

Pure Asma is derived at runtime from scripture rather than seeded from a 99-name table.

```text
AsmaCandidate
  candidateId
  book
  phrase
  normalizedPhrase
  kind
  status
  count
  references[]
  frames[]

DivineRelation
  relationId
  book
  relation
  subject=ALLAH
  predicateSurface
  targetSurface
  reference
  grounding

AsmaSemanticField
  candidateId
  references[]
  contextTokens[]
  method=CORPUS_COOCCURRENCE_ONLY
```

No `ASMA_ID 1..99` key is required by the active Revelation Core.

## Revelation v4.23 records

```text
RevelationCorpusRecord
- bookCategory
- sourceClass
- edition
- language
- ref
- text
- originalRevelationEquated=false (textual witnesses)

FourBookCorroboration
- quran.references[]
- channels.TAWRAT/ZABUR/INJIL
- matchedWitnessBooks
- corroborationRatio
- confidenceBoost

RevelationScorecard
- direction
- directionStatus
- analyticalScore|null
- grounding
- passageDirection
- explicitGraph
- corroboration
- scoreComposition
- epistemicStatus
```


## Typed Revelation passage entities — v4.24

Seed entity types now include `QURAN_AYAH`, `DIVINE_BOOK.TAWRAT_WITNESS_PASSAGE`, `DIVINE_BOOK.ZABUR_WITNESS_PASSAGE`, and `DIVINE_BOOK.INJIL_WITNESS_PASSAGE`. Derived installation artifacts use `REVELATION.DERIVED_INDEX`.

Every seeded row preserves `_seed.sourceId`, `_seed.path`, `_seed.index`, `_seed.sha256`, and `_seed.kind`. Textual-witness payloads additionally preserve `sourceClass=TEXTUAL_WITNESS` and `originalRevelationEquated=false`.

## v4.25 native Revelation binding model

Native binding adds a runtime `revelationBinding` object containing concept, coverage, empirical requirement, discovered Qur'an references, retrieved passage summaries, direction, confidence, status, and an explicit non-normative `languageBridge` descriptor. The seed layer also persists `REVELATION-INDEX::NATIVE-BINDING`, bound to both the four-book corpus fingerprint and language-profile SHA-256.


## v4.26 Revelation scoring model

`revelationSignals` is the analytical bridge between Native Revelation Binding and Mizan. It records: `direction`, `magnitude`, `rgbl`, sparse `impactVector`, `axisProvenance`, structural `features`, scripture `references`, and `pureRevelationInputs`. The direction is inherited from the native binder and cannot be changed by the scoring layer.

`revelationScorecard.scoreComposition` distinguishes `revelationAlignmentScore` from `analyticalScore`. The latter uses Revelation-grounded structural inputs with a versioned engineering formula; `pureAnalyticalScore=false` remains mandatory. The scoring profile and 13-OUT analytical query registry are integrity-bound by `REVELATION-INDEX::SCORING`.

## Semantic Event Graph (v4.27)

Each parsed event node contains an id/sequence, text segment, connector, actor/patient/object/owner clues, occurrence state, knowledge state, context signals, declared-purpose signals, reporting state, action candidates, restoration flag, and parser confidence. Event relations preserve sequence/contrast. `eventInterpretation` stores event-level Revelation binding/magnitude plus aggregate conflict/lifecycle state. Q-DAG stores only hashes of the semantic payload, not the raw input.

## v4.28 Moral Lifecycle model

`moralLifecycle` is separate from the older case processing lifecycle. It records historical violation, active violation, relapse, stage flags, stage timeline, restoration progress, grounding references and invariants. `divineForgivenessAccepted` and `divineRepentanceAccepted` remain `null`; they are outside the data model's computable domain.

## v4.29 Grammar relation model

Grammar tokens carry `surface`, `stemCandidate`, optional low-confidence `rootCandidate`, `canonicalRoot=null`, clitic candidates and confidence. Grammar frames carry `kind`, ayah reference, token index, subject/predicate/target surfaces, polarity, inherited-subject flag, heuristic flag and confidence.


## v4.30 Divine Ontology records

Derived ontology records use stable content-derived IDs for surface concepts (`DOC-*`), context clusters (`DCL-*`), relation families (`DRF-*`) and relation-target concepts (`DTC-*`). Every concept retains scripture references and every explicit target concept retains relation type/polarity. These are derived index entities, not new Revelation text and not canonical Asma declarations.
