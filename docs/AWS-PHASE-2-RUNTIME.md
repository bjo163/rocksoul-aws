# AWS Phase 2 — Legal Persistence & Source Change Worker

## Goal

Make AWS research durable and change-aware without inventing a second persistence system.

## Runtime mapping

AWS uses the shared MoonWitness persistence contract:

```text
AWS LEGAL RECORD
    ↓
EntityRepository
    ↓
memory / file / PostgreSQL

AWS DEPENDENCY
    ↓
RelationRepository

SOURCE REVISION
    ↓
EvidenceRepository
    +
EventStore
    +
SOURCE HEAD Projection

RE-ANALYSIS REQUEST
    ↓
PersistentJobQueue
```

This means PostgreSQL remains the production target while memory/file stay useful for deterministic tests and standalone operation.

## AwsLegalStore

`packages/orchestrator/src/aws/legal-store.ts` owns the domain facade.

Record kinds:

```text
SOURCE
INSTRUMENT
JURISDICTION
APPLICABILITY
CLAIM
ASSESSMENT
CASE
```

The store does not issue SQL.

It uses the shared `PersistenceStore` and therefore inherits:

- transaction boundaries;
- optimistic entity versioning;
- immutable event hashing;
- audit-chain hashing;
- PostgreSQL/file/memory adapters;
- existing backup/recovery and operational tooling.

## Dependency direction

AWS stores dependency edges as:

```text
DEPENDENT --AWS_DEPENDS_ON--> DEPENDENCY
```

Example:

```text
CASE
  ↓ depends on
ASSESSMENT
  ↓
APPLICABILITY
  ↓
INSTRUMENT
  ↓
SOURCE
```

When SOURCE changes, the worker traverses the graph in reverse:

```text
SOURCE CHANGED
  ↑
INSTRUMENT
  ↑
APPLICABILITY
  ↑
ASSESSMENT
  ↑
CASE
```

Only reached CASE objects are queued.

## Source fingerprint

Fingerprinting is deterministic SHA-256 over canonical JSON.

Object keys are sorted recursively.

```text
same legal payload
+ different polling timestamp
= same fingerprint
= no new revision
= no re-analysis
```

The polling timestamp is provenance, not source content.

## Source revision transaction

A changed source snapshot is committed as one logical operation:

```text
EvidenceRecord
  +
immutable AWS.SOURCE.REVISION Event
  +
AWS_SOURCE_HEAD Projection
```

If the transaction fails, it must not leave a partial source revision.

## Re-analysis queue

Changed sources enqueue:

```text
AWS_REANALYZE_CASE
```

Payload:

```json
{
  "caseId": "CASE-AWS-...",
  "sourceId": "SRC-AWS-...",
  "revisionId": "REV-AWS-...",
  "fingerprint": "sha256..."
}
```

Idempotency key:

```text
aws:<caseId>:<revisionId>
```

The same source revision cannot intentionally create duplicate case jobs.

## Critical safety boundary

The source worker can:

- detect source-content changes;
- persist provenance;
- maintain the latest source head;
- discover affected cases;
- enqueue re-analysis.

The source worker cannot:

- mark conduct PERMITTED;
- mark conduct PROHIBITED;
- approve a legal assessment;
- run or approve Mizan;
- silently rewrite canonical historical revisions.

```text
SOURCE CHANGE
    ↓
RE-ANALYSIS REQUEST
    ≠
NEW VERDICT
```

A later analysis/review workflow owns any legal-result change.

## Verification

```bash
npm run test:aws:runtime
npm run aws:check
```

Runtime tests verify:

1. first source snapshot creates a revision;
2. only a dependent case is queued;
3. polling the identical source later is a no-op;
4. changed legal payload creates a new revision and a new idempotent job;
5. assessment legal result is untouched;
6. event and audit chains remain valid;
7. dependency traversal is transitive.

## Network boundary

Phase 2 intentionally does not put HTTP fetching inside the legal core.

Future source adapters for ICRC / ICJ / UNTC will produce verified `AwsVerifiedSourceSnapshot` values and pass them into `AwsSourceWorker`.

This keeps source-specific rate limits, authentication, HTML/API changes, and robots/terms concerns outside legal-domain reasoning.
