# AWS Automatic Research & Re-analysis Contract

## Principle

AWS should grow automatically, but **automation expands the research graph; it does not manufacture authority**.

```text
AUTOMATIC DISCOVERY
      !=
AUTOMATIC LEGAL TRUTH
```

## Research loop

```text
1. DISCOVER
2. DE-DUPLICATE
3. VERIFY SOURCE ORIGIN
4. FETCH / SNAPSHOT
5. HASH + PROVENANCE
6. EXTRACT CANDIDATE OBJECTS
7. CROSS-CHECK
8. DETECT LEGAL CHANGE
9. OPEN / UPDATE RESEARCH WORK
10. REVIEW / CANONICALIZE
11. RE-ANALYZE IMPACTED CASES
12. AUDIT
```

## Discovery targets

Workers may watch official sources for:

- new treaties or protocols;
- entry into force;
- signature, ratification, accession, succession, acceptance, approval;
- reservations, declarations, objections, withdrawals, denunciations;
- judgments, orders, advisory opinions, corrections;
- treaty-body findings and official interpretive material;
- implementation records;
- amended or superseded instruments;
- official source corrections or moved artifacts.

## Candidate states

```text
DISCOVERED
FETCHED
PARSED
CROSS_CHECKED
REVIEW_REQUIRED
CANONICAL
REJECTED
SUPERSEDED
STALE
```

Machine extraction must not skip directly from `DISCOVERED` to a final legal assessment.

## Change fingerprint

Every monitored legal object should support a fingerprint derived from stable metadata and, where allowed, captured source content.

At minimum:

```text
source identity
source role
retrieved_at
effective / action date
content or metadata checksum
parser version
```

A changed fingerprint creates a new research revision.

## Re-analysis graph

Only dependent cases should be re-analyzed.

```text
SOURCE CHANGE
   ↓
LEGAL OBJECT
   ↓
APPLICABILITY RECORDS
   ↓
LEGAL CLAIMS
   ↓
ASSESSMENTS
   ↓
AFFECTED CASES ONLY
```

This dependency path must be queryable and auditable.

## No silent overwrite

A reviewed object is immutable as a historical research state.

Corrections use:

```text
old record
   ↓ superseded_by
new record
```

An assessment records the exact source/revision set used to produce it.

## Research issue contract

When automation cannot safely canonicalize a change, it should open or update research work containing:

- topic/object;
- source;
- detected change;
- affected jurisdictions/cases if known;
- uncertainty;
- suggested next action.

The issue is a work queue, not evidence by itself.

## Review gates

At minimum, review is required when:

- authority/source role is ambiguous;
- treaty status conflicts across sources;
- a reservation/declaration changes applicability;
- jurisdiction is contested;
- customary-law status is asserted;
- sources materially disagree;
- a high-impact result would change from permitted/restricted/prohibited;
- the Mizan layer introduces a normative conclusion not entailed by the legal result.

## Failure behavior

If source retrieval fails or a source becomes unavailable:

```text
DO NOT DELETE CANONICAL HISTORY
DO NOT ASSUME NO LAW EXISTS
DO NOT ASSUME THE PREVIOUS VERSION IS CURRENT
MARK FRESHNESS / RETRIEVAL STATE EXPLICITLY
```

## Scheduling

Cadence is an operational configuration, not a domain fact. Different sources may be polled at different frequencies based on update patterns, rate limits, source terms, and legal significance.

The canonical contract is event/change semantics, not a hard-coded hourly interval.

## Audit output

Each run should be able to report:

- sources checked;
- objects unchanged;
- new candidates;
- changed fingerprints;
- conflicts;
- review items;
- canonicalizations;
- rejected candidates;
- cases queued for re-analysis;
- failures and retry state.
