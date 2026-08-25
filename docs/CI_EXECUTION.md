# CI execution model

`dev` is the integration/development branch. It does **not** trigger automatic certification CI.

## Developer validation

Local targeted/full test commands remain available on `dev` for development and debugging. CI status is not expected for ordinary `dev` pushes.

## Authoritative certification

`.github/workflows/certification.yml` runs only for:

- pushes to `main`;
- pull requests targeting `main`;
- explicit manual dispatch.

The workflow runs on the self-hosted Cosmic Linux runner and covers PostgreSQL, release-focused tests, all application builds, final certification, and Docker build.

## Release evidence rule

A release candidate is promoted to `main` only after the `main` pull request/full-certification gate succeeds for the exact commit under review.

The release evidence package must contain the **complete full-certification result for that exact commit**, including the result of every required gate. A successful local `dev` test run, partial CI run, cancelled run, historical run, or a result from another commit is not a release certification artifact.

## Self-hosted runner hygiene

Certification uses a dedicated PostgreSQL service port that does not assume host port `5432` is free. A stale or unrelated database process on the runner must never prevent certification from starting. Runner-level infrastructure failures are classified separately from application/source failures.
