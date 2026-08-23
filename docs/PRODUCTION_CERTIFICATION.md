# MoonWitness OS — Production Certification N1–N6

This document is the operational gate for the final production phase. The automated contract suite checks architecture and source-level prerequisites; environment-specific drills remain required before a production certification can be marked complete.

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

## Final status rule

`implemented` means source/test/docs contract exists.
`certification pending` means CI or environment evidence is still outstanding.
`certified` requires both automated suite success and the required target-environment drill evidence.
