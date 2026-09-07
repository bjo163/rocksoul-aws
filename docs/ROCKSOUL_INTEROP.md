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

An AWS object should identify external ownership explicitly, for example:

```json
{
  "ref": "event:EVT-...",
  "domain": "EVENT"
}
```

Allowed domain prefixes:

```text
story:
event:
person:
rgbl:
aws:
```

Local validation may verify shape and known bindings. Cross-repository absence must be distinguishable from local corruption.

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
