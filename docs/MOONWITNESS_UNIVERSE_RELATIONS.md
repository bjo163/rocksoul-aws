# MoonWitness Universe Relations

This document defines how CAB should present existing Universal Kernel objects without creating a second domain model or new API family.

## Core rule

Everything remains an existing kernel object: Entity, Event, State, Relation, Evidence, or Case. CAB is a projection over those objects.

## Prophet / Messenger objects

`HERO_REFERENCE.PROPHET` is a **reference entity**, not an isolated universe node and not a generic historical biography record.

Its primary relational view is a bridge across three existing layers:

```text
REVELATION
  BOOK / SURAH / PASSAGE
        │
        │ SCRIPTURE_REFERENCE
        ▼
PROPHET / MESSENGER
        │
        ├── PROPHETIC_EVENT ──► PASSAGE / EVIDENCE
        ├── PLACE ────────────► WORLD
        ├── PEOPLE / COMMUNITY ► WORLD
        ├── MISSION ──────────► WORLD / GOVERNANCE
        └── DIVINE_RELATION ──► REVELATION
```

### Core lane

Only relationships supported by admitted source evidence should appear as established:

- explicit scripture reference
- scripturally grounded event reference
- source/provenance link
- explicit place or people relation when the source supports it

### Derived lane

These remain visible, but are explicitly marked as derived rather than promoted to core truth:

- historical reconstruction
- research hypothesis
- chronology reconstruction
- AI inference

### Unresolved lane

These must remain separate and must not silently enter the core graph:

- conflicted identity
- unsupported chronology
- unverified tradition
- unresolved source disagreement

## Revelation objects

A Book/Surah/Passage is not an isolated document record. It can relate to:

```text
BOOK
 └─ SURAH
     └─ PASSAGE
          ├─ PROPHET
          ├─ EVENT
          ├─ CONCEPT
          ├─ DIVINE_RELATION
          └─ EVIDENCE / PROVENANCE
```

`KNOWLEDGE.SCRIPTURE_REFERENCE` acts as a provenance bridge between a source passage and a referenced Prophet/Event/Concept. It should remain a knowledge/relation object, not be mistaken for the underlying revelation passage itself.

## Prophetic events

`KNOWLEDGE.PROPHETIC_EVENT` is an event-layer object whose grounding is represented separately through scripture references and evidence. CAB should therefore show:

```text
EVENT
  ├─ prophet
  ├─ quran/passages
  ├─ evidence class
  ├─ event tags
  └─ derived/research links (separate)
```

## Presentation principle

CAB should never flatten all links into one undifferentiated graph. Each relation should carry:

`layer + source class + provenance + epistemic status + relation type`.

This keeps Revelation, World, Knowledge, Governance, and Witness views connected while preserving their boundaries.
