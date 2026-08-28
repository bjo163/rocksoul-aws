# Self-hosted Cosmic CI Contract

The `cosmic` self-hosted runner is the authoritative certification environment for `dev` through 5.0.0.

## Runner labels

The certification workflow requires:

```yaml
runs-on: [self-hosted, linux, x64, cosmic]
```

The runner must provide Node 26, npm 11, Git, Docker, Docker Compose, and enough disk/RAM/temp space for the full certification matrix.

## Certification flow

```text
push dev
  -> GitHub Actions
  -> self-hosted runner: cosmic
  -> install/verify dependencies
  -> dependency integrity/audit
  -> docs/architecture/lint/typecheck
  -> release tests
  -> PostgreSQL certification
  -> build API/CAB/Web/XRP/Flow
  -> final certification
  -> Docker build
  -> release evidence
```

## Runner health checklist

- Runner online and idle/available.
- Correct labels present.
- Node 26 and npm 11 selected.
- Docker daemon available to the runner account.
- PostgreSQL 18 container can start.
- Workspace cleanup removes stale generated test files.
- Temporary directories have enough capacity.
- Runner service survives reboot/reconnect.
- Failed jobs retain logs and actionable failure artifacts.

## Release rule

Hosted fast checks may exist as supplemental diagnostics, but they never replace the self-hosted certification lane. `main` must only receive a release commit whose full certification evidence references the exact same commit SHA. The authoritative release evidence is **same-SHA evidence**: the certification result and release artifact must identify the exact same commit SHA, with no substitution from a floating branch or historical run.

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

- 4.33.0 certification;
- 4.33.1 hardening;
- 4.34.0 API/data/SDK platform;
- 4.35.0 worker/distributed execution;
- 4.36.0 product surfaces;
- 5.0.0 platform contract freeze and release certification.
