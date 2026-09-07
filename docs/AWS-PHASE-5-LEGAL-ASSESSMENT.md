# AWS Phase 5 — Holding-Level Legal Assessment

## Goal

Phase 5 prevents AWS from flattening a complex judicial decision into one binary result.

```text
AUTHORITY
   ↓
HOLDING
   ↓
CLAIM
   ↓
CLAIM ASSESSMENT
   ↓
CASE SYNTHESIS
   ↓
OPTIONAL CONDUCT-LEVEL LEGAL RESULT
   ↓
OPTIONAL MIZAN
```

The last two steps are **not automatic**.

## Holding

A holding is a narrow proposition extracted from an authority.

Examples from ICJ case 91:

```text
JURISDICTION        AFFIRMED
COMMISSION CLAIM    NOT_ESTABLISHED
PREVENTION DUTY     BREACH
COOPERATION DUTY    BREACH
```

These are separate records because they answer different legal questions.

```text
HOLDING != WHOLE JUDGMENT
```

## Claim assessment

A claim assessment uses:

- the claim;
- the relevant applicability result;
- supporting holdings;
- contradicting holdings.

Deterministic result:

| Applicability / authority state | Result |
|---|---|
| `NOT_APPLICABLE` | `NOT_REACHED` |
| `UNCERTAIN` | `UNRESOLVED` |
| `PARTIALLY_APPLICABLE` without narrower scope mapping | `UNRESOLVED` |
| support only | `SUPPORTED` |
| contradiction only | `CONTRADICTED` |
| support + contradiction | `MIXED` |
| no relevant holding | `UNRESOLVED` |

## Case synthesis

Case synthesis aggregates claim determinations without inventing a moral or conduct-wide verdict.

```text
SUPPORTED only
    → CONSISTENT_SUPPORT

CONTRADICTED only
    → CONSISTENT_CONTRADICTION

SUPPORTED + CONTRADICTED
    → MIXED_HOLDINGS

MIXED / UNRESOLVED claim
    → UNRESOLVED
```

## Bosnia v Serbia proof

Canonical Phase-5 holdings:

```text
HOLD-ICJ-91-JURISDICTION-AFFIRMED
HOLD-ICJ-91-COMMISSION-NOT-ESTABLISHED
HOLD-ICJ-91-PREVENTION-BREACH
HOLD-ICJ-91-COOPERATION-BREACH
```

Claim assessments:

```text
JURISDICTION    SUPPORTED
COMMISSION      CONTRADICTED
PREVENTION      SUPPORTED
COOPERATION     SUPPORTED
```

Case synthesis:

```text
MIXED_HOLDINGS
```

The legacy case-wide assessment deliberately stays:

```text
LEGAL RESULT  UNRESOLVED
MIZAN         NOT_RUN
REVIEW        REQUIRED
```

## Critical boundaries

```text
NO RESPONSIBILITY FINDING != PERMISSION
BREACH FINDING != CASE-WIDE PROHIBITION
MIXED HOLDINGS != LEGAL CONTRADICTION
CLAIM ASSESSMENT != CASE-WIDE VERDICT
CASE SYNTHESIS != MIZAN
```

## Runtime graph

```text
SOURCE
  ↑
AUTHORITY
  ↑
HOLDING
  ↑
CLAIM ASSESSMENT
  ↑
CASE SYNTHESIS
  ↑
LEGAL CASE
```

This keeps source-impact reanalysis targeted while preserving review gates.
