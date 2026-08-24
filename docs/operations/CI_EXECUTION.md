# CI execution model

Cosmic uses two CI layers on `dev`:

## Fast gate
`.github/workflows/dev-fast.yml` runs on a GitHub-hosted Ubuntu runner for quick feedback on:

- dependency integrity
- documentation and architecture checks
- typecheck/lint
- persistence/SQL boundary
- auth/session contracts
- shared UI contracts
- production certification contracts

It is a feedback gate and does not replace full certification.

## Full certification
`.github/workflows/certification.yml` runs on the `self-hosted` Cosmic Linux runner and covers PostgreSQL, release-focused tests, all application builds, final certification, and Docker build.

A missing workflow run or missing check on a `dev` commit is an infrastructure/runner visibility problem, not evidence of a passing source tree.

## Release rule
`main` must only receive a commit that has a complete full-certification result for that exact commit.
