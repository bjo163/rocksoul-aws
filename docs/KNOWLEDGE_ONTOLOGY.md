# MoonWitness Knowledge Ontology Freeze — L0

## Purpose

Freeze the semantic spine shared by Revelation, Knowledge, Evidence, and CAB before profile expansion. This document defines **node kind**, **source class**, and **epistemic lane** as separate dimensions.

## Core node kinds

```text
PERSON
PROPHET_REFERENCE
PLACE
EVENT
BOOK
SURAH
PASSAGE
CLAIM
SOURCE
EVIDENCE
CASE
REVIEW
WITNESS
AUDIT_RECORD
```

## Epistemic lane

```text
CORE
DERIVED
UNRESOLVED
```

The lane answers: *how grounded is this record in its owning semantic pipeline?*

## Source class

```text
REVELATION
SCRIPTURAL_METADATA
HISTORICAL_REPORT
TEXTUAL_WITNESS
OBSERVATION
INFERENCE
AI_OUTPUT
GOVERNANCE_RECORD
```

Source class answers: *what kind of source produced or grounds this record?*

The dimensions are independent. For example:

```text
CORE + REVELATION
CORE + SCRIPTURAL_METADATA
DERIVED + HISTORICAL_REPORT
DERIVED + AI_OUTPUT
UNRESOLVED + HISTORICAL_REPORT
```

## Canonical relations

```text
REFERENCES
INVOLVES
OCCURS_AT
SUPPORTS
CORROBORATES
CONFLICTS_WITH
DERIVED_FROM
REVIEWED_BY
WITNESSED_BY
AUDITED_BY
```

Relations must preserve provenance and must not silently promote their target into a stronger epistemic lane.

## Prophet rule

`PROPHET_REFERENCE` is a contextual role over a person/reference graph. It is not a replacement for a generic `PERSON` node and it is not a Divine Ontology node.

## Event rule

`EVENT` is the central operational subject for world-state reconstruction. It can connect passage references, people, places, evidence, claims, review state, and witness state.

## Evidence rule

Evidence is a sourced record/edge, not an oracle. `VERIFIED`, `CORROBORATED`, `OBSERVED`, `INFERRED`, and `CONFLICTED` remain distinct operational states.

## Negative boundaries

The system must never:

1. Treat `DERIVED` as equivalent to `REVELATION`.
2. Promote `UNRESOLVED` into `CORE` because a score is high.
3. Treat a `PROPHET_REFERENCE` as Divine Ontology.
4. Treat Witness integrity as factual or Divine truth.
5. Convert an absence of evidence into evidence of absence.
6. Create a specialized profile API when the same graph can be expressed through existing Entity/Relation/Event/Evidence surfaces.

## Projection rule

```text
Canonical nodes + relations + evidence
                ↓
         semantic graph
                ↓
     Universe read model
                ↓
            CAB views
```

CAB is a projection and governance surface. It is not the owner of ontology, Revelation semantics, or Evidence truth conditions.
