# MoonWitness OS — Test Report 4.33.0

**Release:** `4.33.0`
**Status:** CI certification in progress; this report is a release-identity artifact and must not be read as production certification.

## Automated certification scope

The certification workflow covers:

- workspace dependency regeneration and installation;
- release identity and package-version consistency;
- API, CAB, public web, XRP, and Flow builds;
- root semantic, Witness, Revelation, Event, Mizan, Review, persistence, authentication, UI, Universe, ontology, epistemic-boundary, provenance, evidence-history, re-analysis, and N1–N6 production-contract suites;
- API integration tests;
- CAB contracts;
- public web contracts;
- PostgreSQL 18 isolated integration certification;
- current final certification script.

## Certification policy

`PASS` means the automated suite completed successfully for the tested source tree.
`PENDING` means the corresponding workflow/environment evidence has not yet completed.
`CERTIFIED` is reserved for a release whose automated suite and required target-environment evidence are both complete.

## Known release boundary

CI regenerates the workspace lockfile from the canonical 4.33.0 manifests during the job so private workspace packages are never resolved from the public npm registry. The checked-in lockfile is a release-housekeeping item and should be regenerated before tagging/publishing 4.33.0.

Production N1–N6 remain deployment-specific drills: concurrency/failure, PostgreSQL PITR, distributed rate limiting, managed key custody/rotation, deployment security, and separate CAB/XRP/Flow certification.
