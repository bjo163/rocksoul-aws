# MoonWitness Universe Taxonomy

Version: 4.32-aligned

This taxonomy defines how the existing universal Entity/Event/State/Relation/Evidence/Case model is interpreted by MoonWitness and CAB. It does not add a new API surface or a parallel persistence model.

## Product layers

```text
WORLD
  PERSON / PROPHET / PLACE / EVENT / STATE / CASE

KNOWLEDGE
  SOURCE / CLAIM / CONCEPT / EVIDENCE / RESEARCH / HYPOTHESIS

REVELATION
  BOOK / PASSAGE / DIVINE_RELATION / ASMA_CANDIDATE / ONTOLOGY_CONCEPT / MORAL_RELATION

GOVERNANCE
  ACTOR / REVIEW / DECISION / POLICY / AUTHORITY

WITNESS
  LEDGER_EVENT / CHECKPOINT / AUDIT / WITNESS_NODE
```

## Canonical rule

These are interpretation categories over the existing universal model. CAB must use the existing Universal API, entity models, relation/event inspection, evidence, audit, and graph capabilities. No `/universe/*` or other domain-specific API family is required by this taxonomy.

## Epistemic source classes

```text
QURAN_EXPLICIT
TEXTUAL_WITNESS
OBSERVED
SUPPORTED
VERIFIED
CORROBORATED
INFERRED
AI_INFERENCE
UNKNOWN
CONFLICTED
```

Normative Revelation direction remains Qur'an-primary/Muhaimin. Tawrat, Zabur, and Injil textual witnesses are corroboration channels only. Research and machine-derived hypotheses remain non-normative.

## CAB interpretation

CAB is a private governance/operator view of the same universe graph. It should expose selected entities through:

- attributes and state
- relations
- events/history
- evidence/provenance
- analysis/review state
- audit and Witness integrity

A Prophet, Book, Passage, Person, Place, Concept, Event, Case, Evidence record, or Review is therefore not a new backend subsystem. It is a governed view over existing universal objects.

## RGBL display contract

The UI labels must follow the v4.26 semantic contract:

- **R** — violation/harm direction
- **G** — constructive/beneficial direction
- **B** — epistemic grounding
- **L** — restoration/repair

B is not moral benefit. L does not erase historical violation. Numeric analytical output remains engineering telemetry and never represents Divine weighing.

## CAB safety language

World-state and analytical screens should keep the canonical boundaries visible when relevant:

- `SIMULATION · NOT REALITY`
- `HUMAN AUTHORITY · LIMITED`
- `QUR'AN PRIMARY / MUHAIMIN`
- `ANALYTICAL MODEL · NOT DIVINE VERDICT`

## Implementation note

The current Model Registry, graph panel, Case Workflow, Review Queue, Evidence Ledger, Audit Timeline, Review Gate, and Witness panels already provide most of the required primitives. The next UI layer should compose these existing primitives rather than introducing new data APIs.
