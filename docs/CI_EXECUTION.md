# CI Execution Model

`dev` is the integration branch. `main` is the certified release branch.

## Automatic execution

`.github/workflows/certification.yml` runs for:

- pushes to `dev` for continuous integration feedback;
- pull requests targeting `main` for the mandatory promotion gate;
- pushes to `main` so release evidence is retained after promotion;
- explicit manual dispatch.

The workflow runs on the deployed GitHub self-hosted runner (`runs-on: self-hosted`) with Node 26 and PostgreSQL 18.

## Mandatory sequence

Dependency integrity/audit → documentation → architecture → engine-only release scope → package runtime → lint → typecheck → release identity → release-focused tests → PostgreSQL certification → API build → final certification → Docker build.

A failure stops later dependent gates. Skipped downstream jobs are not passes.

## Exact-SHA rule

Only a complete successful run for the exact candidate SHA is authoritative release evidence. A successful local run, previous SHA, partial run, cancelled run, queued run, or stale PR status cannot certify a release.

## Branch safety

Changes promoted from `dev` must not remove `main` certification triggers. CI trigger policy is code and must be reviewed like any other release contract.

## Scope safety

Mandatory CI/tests may certify engine, API/reference host, packages, SDK, persistence, security, jobs, Witness, observability, PostgreSQL, and Docker. They must not require removed product implementations under `apps/web`, `apps/cab`, `apps/xrp`, or `apps/flow`.

## Runner failures

Runner/infrastructure failures are classified separately from application/source failures. Infrastructure uncertainty never converts into a source pass.
