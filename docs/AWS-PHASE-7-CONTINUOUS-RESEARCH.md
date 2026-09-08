# AWS Phase 7 — Continuous Research, Freshness & Targeted Re-analysis

## Goal

Phase 7 makes AWS continuously re-check official sources without allowing network polling to silently rewrite canonical legal research.

```text
SCHEDULE
  ↓
POLL OFFICIAL SOURCE
  ↓
VERIFY + FINGERPRINT
  ↓
SOURCE REVISION
  ↓
FRESHNESS
  ↓
REVISION DIFF
  ↓
AFFECTED CASES ONLY
  ↓
REANALYSIS CANDIDATE
  ↓
REVIEW REQUIRED
  ↓
EXPLICIT CANONICALIZATION
```

The continuous path is deliberately different from one-time/manual ingestion.

```text
CONTINUOUS POLL != CANONICAL UPSERT
```

## Freshness and review are separate axes

Freshness answers whether the latest successful retrieval is recent enough.

```text
FRESH
STALE
UNAVAILABLE
```

Change state answers whether verified source content requires research review.

```text
UNCHANGED
CHANGED
REVIEW_REQUIRED
```

A source may therefore be temporally `FRESH` while its latest change remains `REVIEW_REQUIRED`.

## Monitor policy

The first monitor registry is:

```text
MON-AWS-ICRC-GCIV            every 6h / stale after 24h
MON-AWS-UNTC-GENOCIDE        every 3h / stale after 12h
MON-AWS-ICJ-BOSNIA-SERBIA    every 3h / stale after 12h
```

Cadence is operational configuration, not a legal fact.

The shared `PersistentJobQueue` remains the queue implementation and keeps its existing bounded retry policy:

```text
max attempts  3
retry base    1000 ms
backoff       exponential
terminal      DEAD_LETTER
```

Phase 7 does not create a second queue.

## Read-only live polling

Production polling uses the official adapters directly:

```text
AwsIcrcAdapter.fetchGciv()
AwsUntcAdapter.fetchGenocideConvention()
AwsIcjAdapter.fetchBosniaSerbiaBundle()
```

It does **not** call the Phase-3 manual canonical-ingestion path that upserts instruments/actions/authorities.

This is intentional.

```text
SOURCE CHANGE
!= CANONICAL INSTRUMENT CHANGE
!= CANONICAL TREATY-ACTION CHANGE
!= CANONICAL AUTHORITY CHANGE
!= LEGAL VERDICT CHANGE
!= MIZAN
```

## Source revisions and diffs

A changed verified payload creates an immutable source revision.

Phase 7 then creates a deterministic revision diff:

```text
RDIFF-AWS-...
```

The diff records:

- added paths;
- removed paths;
- changed paths;
- before / after values;
- material-change boolean.

Volatile polling provenance such as `retrieved_at` is excluded through the shared AWS content canonicalizer.

## Targeted re-analysis

The existing dependency graph identifies only affected cases.

```text
SOURCE REVISION
      ↓
AWS_DEPENDS_ON
      ↓
AFFECTED CASES ONLY
      ↓
AWS_REANALYZE_CASE
```

The re-analysis worker recomputes deterministic derived states when their canonical inputs are available:

- applicability overall;
- claim assessment;
- case synthesis.

Output is stored as:

```text
RCAND-AWS-...
```

A candidate always states:

```text
canonical_mutation = false
review_state       = REVIEW_REQUIRED
```

Canonical records are not mutated by candidate generation.

## Review item

Every material verified source change creates:

```text
RVIEW-AWS-...
```

The review item links:

- source;
- source revision;
- revision diff;
- affected cases;
- generated re-analysis candidates.

The review record is a gate, not legal evidence by itself.

## Source unavailable

Retrieval failure produces:

```text
freshness_state = UNAVAILABLE
```

while preserving:

- previous source revision;
- canonical legal records;
- previous assessment history.

The queue retries with bounded exponential backoff. Repeated failure becomes `DEAD_LETTER`; Phase 7 reconciles that terminal queue state into the corresponding research run.

```text
SOURCE UNAVAILABLE
!= SOURCE DELETED
!= LAW DISAPPEARED
!= PREVIOUS VERSION CURRENT
```

## Research runs

Each scheduled poll has a deterministic research-run identity:

```text
RRUN-AWS-...
```

Retries preserve the original `started_at`.

Run status:

```text
RUNNING
COMPLETED
FAILED
DEAD_LETTER
```

Each completed/failed run also appends a research event to the shared event chain.

## Scheduler lifecycle

`AwsResearchScheduler` runs on the existing API host lifecycle.

Production default:

```text
continuous research = enabled
```

Development/test default:

```text
continuous research = disabled
```

Explicit controls:

```text
AWS_CONTINUOUS_RESEARCH=1   force enable
AWS_CONTINUOUS_RESEARCH=0   disable
```

`buildApp({ continuousResearch: boolean })` can override the environment for tests/controlled hosts.

The scheduler is stopped before the shared job queue during application shutdown.

## Stop rules

```text
AUTOMATIC DISCOVERY != AUTOMATIC LEGAL TRUTH
SOURCE CHANGE != CANONICAL OVERWRITE
REANALYSIS CANDIDATE != CANONICAL ASSESSMENT
REVIEW REQUIRED != APPROVAL
DEAD LETTER != DELETE HISTORY
STALE != FALSE
UNAVAILABLE != MISSING LAW
LEGAL CHANGE != AUTO MIZAN
```
