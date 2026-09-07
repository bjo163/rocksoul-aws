# AWS Phase 3A — Official Source Adapters

## Scope

Phase 3A connects the legal runtime to two official source families:

\`\`\`text
ICRC IHL Database
UN Treaty Collection
        ↓
HARDENED HTTP BOUNDARY
        ↓
SOURCE-SPECIFIC PARSER
        ↓
VERIFIED SNAPSHOT
        ↓
AwsSourceWorker
        ↓
SOURCE REVISION
        ↓
AFFECTED CASES ONLY
\`\`\`

This phase does **not** turn source changes directly into a legal verdict.

## ICRC

Canonical source:

\`\`\`text
https://ihl-databases.icrc.org/
\`\`\`

Initial proof:

\`\`\`text
Convention (IV) relative to the Protection of Civilian Persons in Time of War
Geneva, 12 August 1949
\`\`\`

The adapter currently extracts only the narrow metadata it can verify from the official title page:

- canonical instrument identity;
- official title;
- adoption date;
- source role / provenance.

It does not infer State participation from the title page.

## UN Treaty Collection

Canonical source:

\`\`\`text
https://treaties.un.org/
\`\`\`

Initial proof:

\`\`\`text
Convention on the Prevention and Punishment of the Crime of Genocide
Paris, 9 December 1948
UNTC depositary status: IV-1
\`\`\`

The adapter separates:

\`\`\`text
INSTRUMENT
    !=
SIGNATURE
    !=
RATIFICATION
    !=
ACCESSION
    !=
SUCCESSION
    !=
APPLICABILITY
\`\`\`

A participant row may therefore produce more than one Treaty Action record.

Example contract fixture:

\`\`\`text
Australia
  signature     1948-12-11
  ratification  1949-07-08
\`\`\`

The fixture is a parser contract snapshot, **not** a permanent claim that live UNTC status never changes.

## Hardened HTTP boundary

All official adapters use \`AwsOfficialSourceHttpClient\`.

Fail-closed rules:

- exact allowed origin must match before request;
- returned URL origin must still match;
- redirects are rejected rather than silently followed;
- non-2xx responses fail;
- retry is bounded to network/retryable status failures;
- response size is bounded;
- unexpected content types fail;
- parser failure does not create a partial legal result.

\`\`\`text
FETCH FAILURE
    ↓
NO CANONICAL UPDATE
    ↓
NO LEGAL VERDICT
\`\`\`

## Fingerprint rule

Polling time is provenance.

It is not source content.

Therefore these fields are excluded recursively from source-content fingerprints:

\`\`\`text
retrieved_at
captured_at
fetched_at
polled_at
\`\`\`

A later poll with identical legal/status content remains a no-op.

A real change—such as a treaty status or participant action changing—produces a new fingerprint and source revision.

## Runtime ingestion

\`AwsOfficialSourceIngestionService\` coordinates the runtime path.

### ICRC

\`\`\`text
fetch GC IV
  ↓
upsert SOURCE if changed
  ↓
upsert INSTRUMENT if changed
  ↓
link INSTRUMENT → SOURCE
  ↓
AwsSourceWorker
\`\`\`

### UNTC

\`\`\`text
fetch Genocide Convention status
  ↓
upsert SOURCE if changed
  ↓
upsert INSTRUMENT if changed
  ↓
link INSTRUMENT → SOURCE
  ↓
AwsSourceWorker
  ↓
persist deterministic TREATY_ACTION records
\`\`\`

Treaty Action records depend on both the source and instrument.

## Deterministic Treaty Action IDs

IDs derive from:

\`\`\`text
instrument
+ actor
+ action type
+ action date
\`\`\`

The same official action observed on a later poll gets the same ID.

## Live source probe

For operator inspection only:

\`\`\`bash
npm run aws:source:probe -- icrc-gciv
npm run aws:source:probe -- untc-genocide
npm run aws:source:probe -- icj-bosnia-serbia
\`\`\`

The probe prints the normalized verified snapshot. Phase 3B extends the same operator boundary to the bundled ICJ case-91 + judgment source.

It does not persist a verdict.

## Verification

\`\`\`bash
npm run test:aws:adapters
npm run aws:check
\`\`\`

Contract tests verify:

- ICRC GC IV normalization;
- UNTC instrument/status normalization;
- signature vs ratification separation;
- accession and succession recognition;
- deterministic action IDs;
- exact-origin rejection;
- redirect rejection;
- snapshot compatibility with \`AwsSourceWorker\`;
- identical polling no-op behavior;
- changed source content changes the fingerprint;
- idempotent instrument/action persistence.
