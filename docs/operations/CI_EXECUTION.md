# CI execution model

`dev` is the integration trunk. The authoritative certification path is the Cosmic self-hosted runner.

## Self-hosted fast checks
The self-hosted Cosmic Linux runner may execute targeted fast checks before the full certification lane. These checks are diagnostic feedback only.

## Full certification
`.github/workflows/certification.yml` runs on the `self-hosted` Cosmic Linux runner and covers PostgreSQL, release-focused tests, all application builds, final certification, and Docker build.

A missing workflow run or missing check on a `dev` commit is an infrastructure/runner visibility problem, not evidence of a passing source tree.

## Release rule
`main` must only receive a commit that has a complete full-certification result for that exact commit.
