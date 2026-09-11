# Rocksoul Interoperability — Six-Domain + Relationship Contract

## Ownership model

AWS is the canonical **LAW** owner. It may bind foreign canonical records from the other research owners without copying their ownership.

```text
STORY        → rocksoul-mftl        → mftl:
EVENT        → rocksoul-legend      → legend:
PERSON       → rocksoul-superhero   → superhero:
TEXT         → rocksoul-rgbl        → rgbl:
LAW          → rocksoul-aws         → aws:
PERSPECTIVE  → rocksoul-jizz        → jizz:
RELATIONSHIP → rocksoul-correlation → correlation:
```

Repository/product labels and semantic domains are deliberately distinct:

```text
TEXT ≠ RGBL repository identity
LAW ≠ AWS repository identity
PERSPECTIVE ≠ JIZZ repository identity
```

`RGBL` remains accepted only as a legacy AWS foreign-domain alias so existing `XREF-RGBL-*` records and historical case graphs stay reproducible. New exact-text foreign references use semantic `TEXT`.

## AWS question

> **What law applies, to whom, where, when, and with what uncertainty?**

AWS may consume STORY, EVENT, PERSON, TEXT, PERSPECTIVE, and reviewed RELATIONSHIP context. It does not canonicalize those records.

## Foreign reference form

```json
{
  "domain": "TEXT",
  "canonical_ref": "rgbl:mw:passage:...",
  "repository": "bjo163/rocksoul-rgbl",
  "ownership": "FOREIGN"
}
```

Canonical references resolve against the owning repository's `main`. A target that exists only on `dev` is development/pending promotion, not canonical.

## Legal case binding graph

AWS owns a **legal case composition graph**, not the ecosystem-wide relationship graph.

New semantic case bindings may include:

```text
CASE_HAS_STORY
CASE_HAS_EVENT
CASE_HAS_PERSON
CASE_HAS_TEXT
CASE_HAS_PERSPECTIVE
CASE_HAS_RELATIONSHIP
CASE_HAS_LEGAL_BASIS
CASE_HAS_APPLICABILITY
CASE_HAS_CLAIM
CASE_HAS_ASSESSMENT
```

Historical compatibility is preserved:

```text
CASE_HAS_RGBL
XREF-RGBL-*
```

Those legacy names remain valid for replay of existing records but must not be interpreted as declaring `RGBL` a semantic domain.

## Correlation boundary

```text
AWS CASE BINDING
= which foreign/local resources a legal case depends on

ROCKSOUL CORRELATION
= reviewed relationship semantics between canonical domain records
```

AWS may point to a `correlation:` record. It must not publish a competing global relationship edge merely because a legal case references multiple domains.

## Perspective boundary

AWS may bind a JIZZ perspective when legal discourse or perceived legal impact is relevant:

```text
jizz:...
→ FOREIGN PERSPECTIVE CONTEXT
→ AWS legal case
```

That does not convert public opinion into legal applicability or a legal result.

```text
PERSPECTIVE ≠ LEGAL VERDICT
```

## Non-duplication

```text
FOREIGN CANONICAL RECORD
        ↓
THIN VERIFIED REFERENCE / SNAPSHOT
        ↓
AWS CASE CONTEXT
        ↓
LEGAL ANALYSIS
```

Snapshots are derived and non-authoritative. Cross-repository absence is represented explicitly as `MISSING`; it is not local AWS corruption.

## Evidence flow

A defensible case may combine:

```text
STORY context
EVENT reconstruction
PERSON agency
TEXT attestation
PERSPECTIVE / public framing
reviewed RELATIONSHIP context
        ↓
AWS LAW + applicability
        ↓
legal claims + counterclaims
        ↓
assessment + uncertainty
        ↓
optional Mizan methodology
```

Mizan is an analytical capability, not a canonical world-object domain, and a Mizan result is not a court judgment or universal verdict.

## Independence rule

Normal AWS CI validates local bindings, schemas, deterministic IDs, provenance, and ownership boundaries without requiring every remote repository to be online. Remote existence/freshness belongs to research, integration audit, or release certification.

## Guardrails

```text
FOREIGN REFERENCE ≠ OWNERSHIP
LEGAL APPLICABILITY ≠ HISTORICAL FACT
LEGAL RESULT ≠ MIZAN
PERSPECTIVE ≠ LEGAL VERDICT
CASE BINDING ≠ GLOBAL CORRELATION EDGE
OWNER HEAD MOVED ≠ RECORD BECAME FALSE
```
