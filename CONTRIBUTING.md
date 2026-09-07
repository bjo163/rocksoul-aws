# Contributing to AWS — Angel With Shotgun

## Canonical branch model

The remote repository has exactly two long-lived branches:

```text
main   ← stable / release
dev    ← all development
```

Rules:

- All implementation, research-data, schema, documentation, CI, and maintenance work is committed to `dev`.
- Do not create or push remote `feature/*`, `fix/*`, `hotfix/*`, `release/*`, or personal branches.
- `main` is not a development branch.
- The only release promotion path is `dev → main`.
- Emergency fixes still land in `dev` first, are verified there, and are then promoted to `main`.
- Release-version preparation happens on `dev`; release automation must never create a third branch.
- Tags/releases are produced only from a certified `main` commit.

See [docs/BRANCHING.md](docs/BRANCHING.md) for the complete contract.

## Development validation

Before considering `dev` ready for promotion, run the applicable checks:

```bash
npm run lint
npm run typecheck
npm test
npm run aws:check
```

For release work, also run the applicable build, PostgreSQL, and certification commands.

## Coding rules

- No `@ts-nocheck`.
- No new explicit `any` / `as any` escape hatches.
- Prefer explicit interfaces at domain boundaries.
- Use `unknown` for untrusted or dynamic input and narrow it safely.
- Keep commits focused and auditable.
- Do not bypass failing CI checks without documented evidence.
- Legal research automation may create research/re-analysis work, never an unreviewed final legal/Mizan verdict.

## Pull requests

Remote pull requests are release promotions, not development branches.

The canonical PR is:

```text
dev → main
```

Describe the release scope, validation evidence, migration/security/API impact, known deferred work, and the exact `dev` commit being promoted.
