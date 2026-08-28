# Cosmic — Production Certification N1–N6

This runbook covers engine/API/reference-host production concerns. Product Web/CAB/XRP/Flow certification belongs to the repositories that own those applications.

## Evidence states

- `implemented` — source/test/docs contract exists.
- `ci-pending` — current SHA has not completed mandatory CI.
- `environment-pending` — CI is green but deployment evidence is outstanding.
- `certified` — mandatory automated and target-environment gates passed.
- `blocked` — a required gate failed or is unresolved.

## N1 — Atomicity / concurrency / failure

Verify idempotent duplicate requests converge, optimistic conflicts reject lost updates, logical multi-write mutations are transactional, failed event/Witness writes do not leave partial state, and restart/retry preserves deterministic state.

## N2 — PostgreSQL durability / recovery

Verify empty install, migrations, representative upgrade path, backup, isolated restore, row/projection invariants, replay, and recovery. Destructive restore remains offline; no remote destructive restore API is permitted.

## N3 — Rate limiting and runtime topology

Verify independent auth/AI/write/read buckets, reverse-proxy behavior, timeout/backpressure limits, and shared distributed enforcement before horizontal multi-instance deployment.

## N4 — Key custody / Witness

Verify managed secret custody, key rotation/revocation, restart persistence, Q-DAG/checkpoint integrity, backup/recovery, and absence of private key material from export packages.

## N5 — Deployment security

Verify strong managed secrets, explicit allowed origins where browser consumers exist, secure transport/cookie policy where applicable, least-privilege database role, redacted production errors/logs, bounded health disclosure, and no secret leakage.

## N6 — Reference-host certification

Verify API/OpenAPI/SDK compatibility, persistence, worker/jobs, Witness/audit/provenance, observability, PostgreSQL readiness, graceful shutdown, Docker image, and backend staging smoke. No product UI/browser certification is required in Cosmic.

## CI annotation rule

Every candidate run must be checked for errors and warnings. Classify each warning as release blocker, owned environment/dependency notice, or non-actionable informational output.

## Final rule

Do not mark a production state certified from source inspection alone. Certification must reference the exact SHA and the complete required gate evidence.
