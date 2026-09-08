# Rocksoul Interoperability — Five-Domain Contract

## Domain graph

```text
STORY ─────┐
EVENT ─────┼──> CASE / QUESTION ───> AWS LAW + APPLICABILITY
PERSON ────┤                         │
RGBL ──────┘                         └──> LEGAL / MIZAN ASSESSMENT
```

The public research grammar is:

```text
STORY × EVENT × PERSON × RGBL × AWS
```

## Ownership questions

| Domain | Canonical question | AWS behavior |
|---|---|---|
| STORY | What was told? | reference narrative records; do not duplicate them |
| EVENT | What happened? | reference facts, time, place, evidence; do not silently rewrite them |
| PERSON | Who crossed the frame? | reference actors, roles, agency, transmission |
| RGBL | What does the source actually say? | reference exact text / passage / source identity |
| AWS | Was it allowed? | own legal source, jurisdiction, applicability, legal claims and legal analysis |

UI naming and repository-to-tab presentation belong to `rocksoul-assets`. AWS must consume domain identifiers through configuration/interop contracts rather than hard-coding UI repository labels.

## Cross-repository reference form

An AWS object identifies semantic domain separately from the canonical owner-repository reference.

Example:

```json
{
  "domain": "EVENT",
  "canonical_ref": "legend:EVT-..."
}
```

Canonical backend bindings are:

```text
STORY   → bjo163/rocksoul-mftl      → mftl:
EVENT   → bjo163/rocksoul-legend    → legend:
PERSON  → bjo163/rocksoul-superhero → superhero:
RGBL    → bjo163/rocksoul-rgbl      → rgbl:
```

The semantic labels STORY / EVENT / PERSON / RGBL must not be confused with canonical ref prefixes. UI naming remains presentation-owned by `rocksoul-assets`.

Local validation verifies deterministic foreign-node identity, repository binding, canonical prefix, and verification state. Cross-repository absence is represented as `MISSING` and remains distinguishable from local corruption.

## Non-duplication rule

AWS may cache or index foreign metadata for search, but the cache is derived and non-authoritative.

```text
FOREIGN CANONICAL RECORD
        ↓
REFERENCE / SNAPSHOT
        ↓
AWS CASE CONTEXT
        ↓
LEGAL ANALYSIS
```

A snapshot records which version AWS analyzed. It does not transfer ownership.

## Evidence flow

A defensible five-domain case keeps every step inspectable:

```text
STORY claim
   ↓
EVENT reconstruction
   ↓
PERSON agency / role
   ↓
RGBL exact text when relevant
   ↓
AWS legal source + applicability
   ↓
claim / counterclaim
   ↓
result + uncertainty
   ↓
optional Mizan
```

## Five-way boundary proof

The existing shared research cases can be extended into AWS without forcing a legal verdict.

A historical event may be fully evidenced while AWS still returns:

```text
APPLICABILITY: UNCERTAIN / NOT_APPLICABLE
LEGAL RESULT: UNRESOLVED
```

when no temporally and jurisdictionally valid legal basis has been established.

That is a successful integration result, not a failure. It proves that **evidence of an event is not automatically evidence of a governing legal rule**.

## UI boundary

`rocksoul-assets` remains the design source of truth for the five-domain visual grammar. AWS exports machine-readable data and stable contracts suitable for public observatory, case, correlation, legal, community, and admin surfaces.

AWS must not embed presentation-specific assumptions into canonical legal records.


## Runtime graph

Phase 6 materializes the interop contract through two distinct graph layers.

### Semantic relations

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

### Impact relations

```text
AWS_DEPENDS_ON
```

Semantic edges describe meaning. Dependency edges support targeted re-analysis.

```text
SEMANTIC EDGE != DEPENDENCY EDGE
```

Foreign objects are represented locally only by thin `FOREIGN_REF` records with provenance and verification state. Their canonical payload remains owned by the source repository.
