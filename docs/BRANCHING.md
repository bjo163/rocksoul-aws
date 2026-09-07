# Canonical Branching Contract

## Two branches only

```text
main   ← stable / release
dev    ← all development
```

This is the complete remote branch model for `bjo163/rocksoul-aws`.

## dev

`dev` owns all ongoing work:

- application/runtime code;
- legal research and corpus changes;
- schema evolution;
- persistence and workers;
- tests;
- documentation;
- CI/workflow maintenance;
- release-version preparation.

Development commits may be small and incremental. CI is allowed to expose failures on `dev`; they must be resolved before promotion.

## main

`main` is the stable/release branch.

Rules:

- do not develop directly on `main`;
- do not use `main` as an experiment branch;
- promotion is only from `dev`;
- release tags point only at certified `main` commits;
- `main` should never contain commits that are absent from the promoted `dev` lineage, except GitHub's merge commit for the `dev → main` promotion itself.

## Forbidden remote branches

The following remote patterns are intentionally unsupported:

```text
feature/*
fix/*
bugfix/*
hotfix/*
release/*
chore/*
experiment/*
user/*
phase*
```

Local temporary branches are a local Git concern only. They must not be pushed to the canonical remote.

## Release flow

```text
WORK
  ↓
dev
  ↓
DEV CI + AWS LEGAL GATES
  ↓
dev → main PR
  ↓
MAIN CI / CERTIFICATION
  ↓
TAG / RELEASE
```

There is no release branch between `dev` and `main`.

## Emergency fix

```text
fix on dev
  ↓
verify
  ↓
dev → main
```

No `hotfix/*` branch is created.

## Automation policy

Repository workflows must obey the same model:

- push validation may target `dev` and `main`;
- pull-request validation targets `main`, because the only remote PR is `dev → main`;
- workflows must not create additional remote branches;
- branch cleanup automation deletes noncanonical remote branches;
- release automation may create tags/releases, not branches.

## Source of truth

If another document, old issue, inherited Cosmic document, workflow, or instruction describes a different Git branching model, this file wins for AWS.
