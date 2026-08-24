# MoonWitness OS — Production Certification N1–N6

**Release line:** `4.33.0`

This document is the operational gate for the final production phase. The automated contract suite checks architecture and source-level prerequisites; environment-specific drills remain required before a production certification can be marked complete.

## Evidence states

Use these exact states in certification artifacts:

- `implemented` — source/test/docs contract exists.
- `ci-pending` — implementation exists but the current head has not completed the required CI gate.
- `environment-pending` — CI is green but deployment-specific evidence is outstanding.
- `certified` — automated suite and required target-environment evidence both passed.
- `blocked` — a required gate has failed or has an unresolved release annotation.

Do not mark a gate `certified` from source inspection alone.

## N1 — Concurrency / failure drills

Required evidence:
- concurrent identical idempotency-key requests converge to one persisted result;
- optimistic entity version conflicts are rejected without lost updates;
- witness append/checkpoint survives a process restart;
- failed jobs do not become successful by replaying stale state.

Automated contract: `tests/production-certification-contract.test.ts`.

## N2 — PostgreSQL retention / PITR

Required evidence in the target environment:
- backup created from the production PostgreSQL instance;
- restore completed into an isolated instance;
- row counts and representative Entity/Relation/Event/Evidence/Review/Witness projections verified;
- witness local ledger remains canonical and PostgreSQL projection is reconciled;
- point-in-time recovery to a known timestamp verified.

The application deliberately keeps destructive restore offline; there is no remote restore API.

## N3 — Rate limiting

Required evidence:
- authentication, AI, write, and general-read buckets remain independently bounded;
- sustained traffic to one bucket does not starve another;
- limits work correctly behind the chosen reverse proxy/load balancer;
- distributed enforcement is enabled before more than one API instance is deployed.

The current security model explicitly requires a shared distributed limiter before horizontal multi-instance deployment.

## N4 — Key custody / rotation

Required evidence:
- production `WITNESS_KEY_PASSWORD` is supplied by managed secret custody;
- active key rotation creates a new active key and supersedes the old key;
- emergency revoke leaves signing unavailable until explicit replacement;
- backup/export packages contain no private key material;
- restart preserves key state and revocation state.

The application uses the encrypted local keystore for the current single-node deployment. KMS/HSM integration remains deployment-specific.

## N5 — Deployment security

Required evidence:
- non-default managed `JWT_SECRET` with sufficient entropy/length;
- explicit browser-origin allowlist;
- secure cookie policy appropriate to deployment;
- database role cannot create schema in production;
- production 500 responses omit internal exception text;
- health disclosure remains limited to status/release for unauthenticated callers;
- secrets are absent from source control, logs, backups, and API responses.

## N6 — Application-specific certification

Certification is separate for:

### CAB
Verify governed operator authentication, Universe Observatory, provenance/uncertainty surfaces, Review/Witness/Audit rail, and accessibility/localization contracts.

### XRP
Verify public RID-scoped workspace, object authorization, evidence submission semantics, idempotent writes, and review-request boundary.

### Flow
Verify draft-only workflow creation, transactional review intent, Witness-pending state, idempotent request/retry behavior, and prohibition on automatic publication/adverse action.

## CI annotation rule

Every release-candidate CI run must be checked for both errors and warnings. A historical failed run must not be used as current evidence, and a warning must be classified as one of:

1. release blocker — must be fixed before release;
2. environment/dependency notice — documented with owner and follow-up;
3. non-actionable informational output.

The release status must link the current run used as certification evidence rather than relying on an older run.

## Final status rule

`implemented` means source/test/docs contract exists.  
`ci-pending` means the current head has not completed CI.  
`environment-pending` means CI is green but operational evidence remains.  
`certified` requires both automated suite success and the required target-environment drill evidence.  
`blocked` means a required gate failed or has an unresolved release annotation.
