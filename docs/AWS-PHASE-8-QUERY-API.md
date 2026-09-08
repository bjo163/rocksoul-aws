# AWS Phase 8 — Query API, Observability & Operator Research

## Goal

Phase 8 exposes the completed AWS legal-research engine through stable API contracts without requiring consumers to understand internal persistence layout.

```text
ROCKSOUL-WEB / OPERATOR
          ↓
AWS QUERY API
          ↓
AwsQueryService
          ↓
AwsLegalStore
          ↓
shared persistence
```

Routes do not read `data/aws/*` directly.

## Native API surface

```text
GET  /api/v1/aws/cases/:id
GET  /api/v1/aws/cases/:id/graph
GET  /api/v1/aws/cases/:id/history

GET  /api/v1/aws/sources
GET  /api/v1/aws/sources/:id/revisions

GET  /api/v1/aws/research/runs
GET  /api/v1/aws/research/reviews

GET  /api/v1/aws/observability

POST /api/v1/aws/research/reanalyze
```

All endpoints are owned by `apps/api/src/routes/aws.routes.ts`. They are not legacy `v1.routes.ts` compatibility routes.

## Case bundle

`GET /api/v1/aws/cases/:id` returns a normalized bundle containing:

- case record;
- typed graph relations;
- graph nodes;
- instruments;
- jurisdictions;
- treaty actions;
- authorities;
- holdings;
- applicability;
- claims;
- claim assessments;
- case syntheses;
- assessments;
- foreign refs.

Foreign refs retain:

```text
ownership = FOREIGN
```

The API does not transfer canonical ownership into AWS.

## Typed graph

`GET /api/v1/aws/cases/:id/graph` exposes runtime graph connectivity rather than storage-folder structure.

Semantic relations remain distinct from dependency relations.

```text
CASE_HAS_*
!=
AWS_DEPENDS_ON
```

## History

`GET /api/v1/aws/cases/:id/history` exposes:

- current record version;
- updated time;
- event history;
- audit history.

This endpoint requires `READ_AUDIT`.

## Source inventory and revisions

`GET /api/v1/aws/sources` combines:

- source identity;
- current freshness record;
- latest verified revision summary.

`GET /api/v1/aws/sources/:id/revisions` returns immutable verified source-revision history ordered newest first.

```text
SOURCE REVISION HISTORY
!=
CANONICAL LEGAL VERDICT HISTORY
```

## Research operations

Read endpoints:

```text
GET /api/v1/aws/research/runs
GET /api/v1/aws/research/reviews
```

Both require `READ_AUDIT`.

These expose continuous-research operational state. They are not primary legal evidence.

## Observability

`GET /api/v1/aws/observability` summarizes:

- case counts;
- source freshness states;
- source change states;
- research-run status counts;
- review backlog;
- reanalysis candidate backlog;
- AWS queue status/type counts;
- event-chain integrity;
- audit-chain integrity.

```text
OBSERVABILITY
!=
LEGAL EVIDENCE
```

Observability intentionally does not calculate a legal result or Mizan result.

## Operator re-analysis

`POST /api/v1/aws/research/reanalyze`

Request:

```json
{
  "caseId": "LCASE-...",
  "sourceId": "SRC-AWS-..."
}
```

The endpoint requires `COMMAND`.

The operator service verifies:

1. case exists;
2. source exists;
3. case is actually dependent on the source;
4. source has a latest verified revision.

It then enqueues:

```text
AWS_REANALYZE_CASE
```

using the same deterministic idempotency key as automatic Phase-7 re-analysis.

Response explicitly preserves:

```text
canonical_mutation = false
mizan_auto_run     = false
```

## Authorization

Read case/source summaries require an authenticated session.

Audit-sensitive surfaces require:

```text
READ_AUDIT
```

Operator mutation/request surface requires:

```text
COMMAND
```

No endpoint provides a review bypass.

## OpenAPI & route inventory

The nine native AWS operations are included in:

- native route inventory;
- explicit capability ownership;
- OpenAPI exact operation parity.

Any future route drift must update these contracts or CI fails.

## Stop rules

```text
API READ != OWNERSHIP TRANSFER
SOURCE HISTORY != LEGAL VERDICT
OBSERVABILITY != EVIDENCE
REANALYZE REQUEST != VERDICT
QUEUE JOB != APPROVAL
OPERATOR != REVIEW BYPASS
API != AUTO MIZAN
```
