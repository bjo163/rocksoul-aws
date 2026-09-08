# AWS Phase 6 — Cross-Repository Case Graph

## Goal

Phase 6 turns the public research grammar

```text
STORY × EVENT × PERSON × RGBL × AWS
```

into a runtime-traversable graph without moving canonical ownership into AWS.

## Ownership model

```text
FOREIGN CANONICAL RECORD
        ↓
REFERENCE VERIFICATION
        ↓
AWS FOREIGN_REF
        ↓
CASE GRAPH EDGE
        ↓
AWS CASE / LEGAL ANALYSIS
```

A `FOREIGN_REF` is deliberately thin.

It may contain verification/provenance metadata and an optional derived snapshot, but it never becomes the canonical STORY, EVENT, PERSON, or RGBL record.

```text
FOREIGN_REF != FOREIGN CANONICAL RECORD
```

## Repository bindings

Canonical domain bindings:

| Domain | Repository | Ref prefix |
|---|---|---|
| STORY | `bjo163/rocksoul-mftl` | `mftl:` |
| EVENT | `bjo163/rocksoul-legend` | `legend:` |
| PERSON | `bjo163/rocksoul-superhero` | `superhero:` |
| RGBL | `bjo163/rocksoul-rgbl` | `rgbl:` |

The machine-readable binding record is:

```text
BIND-AWS-ROCKSOUL-V1
```

These are backend interop bindings, not UI repository labels.

## Foreign reference state

```text
VERIFIED
UNVERIFIED
MISSING
STALE
```

Important:

```text
MISSING FOREIGN RECORD != LOCAL AWS CORRUPTION
```

A missing external object is represented explicitly and may be rechecked later.

## Two graph layers

### Semantic graph

Typed relations explain what a node means to the case:

```text
CASE_HAS_STORY
CASE_HAS_EVENT
CASE_HAS_PERSON
CASE_HAS_RGBL
CASE_HAS_LEGAL_BASIS
CASE_HAS_APPLICABILITY
CASE_HAS_CLAIM
CASE_HAS_ASSESSMENT
```

### Dependency graph

AWS separately records:

```text
CASE
  DEPENDS_ON
FOREIGN_REF / LEGAL NODE
```

This second layer is used for impact analysis and targeted re-analysis.

The two graphs are related but not interchangeable.

```text
SEMANTIC EDGE != DEPENDENCY EDGE
```

## Deterministic identities

Foreign node ID:

```text
XREF-{DOMAIN}-{SHA256(domain|canonical_ref)[0:24]}
```

Graph edge ID:

```text
GEDGE-{SHA256(case|relation|target)[0:24]}
```

This makes repeated ingestion idempotent and detects forged/drifting graph identities.

## Jerusalem 70 CE five-domain proof

Canonical graph:

```text
CGRAPH-JERUSALEM-70-FIVE-DOMAIN
```

Verified foreign nodes:

```text
STORY
mftl:MYTH-JERUSALEM-TEMPLE-DESTRUCTION-PROPHECY-000001

EVENT
legend:EVT-JERUSALEM-SECOND-TEMPLE-DESTRUCTION-70

PERSON
superhero:PER-JERUSALEM-FLAVIUS-JOSEPHUS

RGBL
rgbl:mw:passage:sblgnt:v1-2:mark:13:2
rgbl:mw:passage:web-classic:2020:mar:13:2
```

AWS-local nodes:

```text
LAW-IHL-GCIV-1949
APPL-JERUSALEM-70-GCIV
LCLAIM-JERUSALEM-70-GCIV-TEMPORAL
LASSMT-JERUSALEM-70-GCIV
```

The graph therefore connects all five domains while preserving the legal boundary:

```text
EVENT EXISTS
    !=
MODERN TREATY APPLIES
```

## External verification evidence

Phase 6 independently checked the Jerusalem references against their owner repositories.

The foreign-reference records preserve:

- repository;
- canonical ref;
- canonical/evidence path;
- source commit SHA;
- verification time;
- match kind.

AWS does not copy the foreign payload.

## Runtime behavior

`AwsCrossRepoGraphService` can:

- persist verified/unverified/missing/stale foreign references;
- validate repository/ref-prefix ownership;
- create deterministic graph edges;
- materialize typed runtime relations;
- traverse case → five-domain neighbors;
- traverse foreign ref → affected AWS case.

## Guardrails

```text
REFERENCE != OWNERSHIP
SNAPSHOT != CANONICAL RECORD
CROSS-REPO ABSENCE != LOCAL CORRUPTION
GRAPH CONNECTION != CAUSATION
GRAPH CONNECTION != THEOLOGICAL VERDICT
FOREIGN CHANGE != AUTOMATIC LEGAL VERDICT
```
