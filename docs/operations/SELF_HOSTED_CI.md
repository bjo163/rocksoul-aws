# AWS Self-hosted CI Contract

The deployed GitHub self-hosted runner is the authoritative full certification environment for AWS engine/API releases.

## Runner labels

The certification workflow requires:

```yaml
runs-on: self-hosted
```

The runner must provide Node 26, npm 11, Git, Docker, Docker Compose where deployment rehearsal requires it, and enough disk/RAM/temp space for the full certification matrix.

## Certification flow

```text
push dev / PR to main / push main
  -> GitHub Actions
  -> deployed self-hosted runner
  -> install/verify dependencies
  -> dependency integrity/audit
  -> docs/architecture/lint/typecheck
  -> engine/package/API release tests
  -> persistence + PostgreSQL certification
  -> SDK/contracts/security/worker/Witness checks
  -> build API
  -> final certification
  -> Docker build
  -> release evidence
```

Product Web, XRP, CAB, and Flow browser applications are external consumers and are not AWS certification build dependencies. Their browser/UI presentation, screenshot, localization, and accessibility certification belongs to their owning product repositories.

## Runner health checklist

- Runner online and idle/available.
- Runner is registered with the standard `self-hosted` label and is online.
- Node 26 and npm 11 selected.
- Docker daemon available to the runner account.
- Docker Compose available where deployment/recovery rehearsal requires it.
- PostgreSQL 18 container can start.
- Workspace cleanup removes stale generated test files.
- Temporary directories have enough capacity.
- Runner service survives reboot/reconnect.
- Failed jobs retain logs and actionable failure artifacts.

## Release rule

Hosted fast checks may exist as supplemental diagnostics, and the AWS Legal Corpus workflow may provide domain-specific corpus evidence, but neither replaces the self-hosted full certification lane. `main` must only receive release candidates whose full certification evidence references the exact candidate SHA. Queued, cancelled, partial, historical, local-only, or different-SHA results are not release certification evidence.

The authoritative release evidence is **same-SHA evidence**: the certification result and release artifact must identify the exact same commit SHA, with no substitution from a floating branch or historical run.

## Failure evidence

For a failed certification, retain:

- workflow run and job ID;
- exact commit SHA;
- failing test names/TC IDs;
- final TAP summary;
- relevant PostgreSQL/Docker logs;
- build/typecheck/lint failure output;
- artifact or reproducer for the first causal failure cluster.

## Version policy

This contract applies to:

- 4.33.x certification and hardening;
- 4.34.x API/data/SDK platform work;
- 4.35.x worker/distributed execution;
- 4.36.x engine-intelligence/TSE integration;
- 5.0.0 platform contract freeze and release certification.

For the current certification scope and historical-document boundary, see `docs/operations/CURRENT_CERTIFICATION_SCOPE.md` and `docs/TESTING.md`.
