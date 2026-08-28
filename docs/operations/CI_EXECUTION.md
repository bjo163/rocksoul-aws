# CI execution model

`dev` is the integration/development branch. It does **not** trigger automatic CI.

## Developer validation
Local targeted/full test commands remain available on `dev` for development and debugging. CI status is not expected for ordinary `dev` pushes.

## Authoritative certification
`.github/workflows/certification.yml` runs only for:

- pushes to `main`;
- pull requests targeting `main`;
- explicit manual dispatch.

The workflow runs on the `self-hosted` Cosmic Linux runner and covers PostgreSQL, release-focused tests, all application builds, final certification, and Docker build.

## Release evidence rule
A release candidate is promoted to `main` only after the `main` pull request/full-certification gate succeeds for the exact commit under review.

**Main release evidence must include the complete full-certification result for that exact commit.**

A successful local `dev` test run is development evidence, not a release certification artifact. Historical or partial CI results do not satisfy the main release evidence requirement.
