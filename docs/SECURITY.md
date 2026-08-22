# Universe OS — Security & Identity

## Actor classes

```text
HUMAN
BOT
AI
SYSTEM
SERVICE
PROCESS
RESERVED_SYMBOLIC
```

## Authorization model

```text
Identity
→ Role / Capability
→ Resource scope
→ Action
→ Audit
```

Privileged operations require explicit authorization. `MLV-001 / MYLOVE` is represented as a reserved symbolic principal for application-level control semantics; it is not a claim that software possesses divine authority.

## Sessions and permissions

Authentication uses durable, revocable sessions issued by the register/login routes. Browser clients receive `HttpOnly`, `SameSite` cookies and never store access or refresh tokens in `localStorage`. SDK/service clients may explicitly use bearer transport. Refresh tokens are stored server-side only as hashes and rotate on every refresh. Permissions are role-based:

- `ADMIN`: observe, analyze, evaluate, command, administration, and audit access.
- `REVIEWER`: observe, analyze, evaluate, and audit access.
- `OPERATOR`: observe, analyze, and command access.
- `USER`: authenticated identity without privileged evaluation, command, or audit access.

Observation and analysis may accept an anonymous service actor only outside production. Production requires `OBSERVE` or `ANALYZE`, while query, evaluation, commands, replay/audit access, job processing, and ingress routes require their relevant permissions. Logout, refresh replay protection, RID-change revocation, and account-wide revocation survive process restart; PostgreSQL deployments share this state across API instances.

Production must supply a stable managed signing secret, explicit browser-origin allowlist, and secure-cookie configuration. Signing-key rotation and emergency-revocation operations remain a deployment runbook requirement; application database roles do not receive schema-creation privileges.

## RID identity binding

RID is an authority-bearing scope, not a public profile field. Public registration always creates an unbound `USER` and rejects client-supplied RID. An administrator may provision an RID-bound account or bind an existing unbound account exactly once. Rebinding to another RID is rejected, the binding is written to immutable audit/event history, and all older sessions are revoked before the new RID can be used.

RID does not encode spiritual rank, moral score, achievement, or Divine authority. It is a governed application identity and tenancy boundary only.

## Audit

Writes preserve actor identity and record before/after state where supported. The ledger is append-oriented and hash chained. Audit/replay access is permission-gated. Idempotency keys are scoped by actor and operation, persisted in PostgreSQL deployments, and serialized in memory so concurrent retries cannot create duplicate XRP/Flow records. Versioned entity updates use optimistic compare-and-swap semantics to reject lost updates.

Flow review requests persist a `WITNESS_PENDING` state and review intent transactionally before the external Q-DAG commit, then finalize `REVIEW_REQUIRED` with the committed hash. This avoids presenting a Witness commitment before durable workflow state exists and makes retries converge on one governed result.

## Production disclosure boundary

Public production health exposes only status and release. Detailed dependency health, kernel/ledger state, database/environment identifiers, semantic registries, raw jobs, and model/graph internals require audit authority. Job status is requester-scoped and sanitized. Production 500 responses omit internal exception text. Authentication, AI, writes, and general reads use distinct bounded rate-limit buckets; a shared limiter is still required before horizontal multi-instance deployment.


## Single-node witness key custody (v4.20; v4.19 baseline retained)

The active witness private key is persisted in an AES-256-GCM encrypted local keystore with a key derived by `scrypt`. Production startup requires `WITNESS_KEY_PASSWORD`; there is no production fallback. Development may generate a separate local master-secret file with restrictive permissions. That fallback reduces accidental plaintext exposure but is not KMS/HSM-equivalent.

Key lifecycle is explicit: `ACTIVE`, `SUPERSEDED`, or `REVOKED`. Revocation survives restart and a revoked sole active key is not automatically replaced. Signing remains unavailable until an administrator explicitly creates a replacement. Public metadata may be mirrored to PostgreSQL; private PEM material must never enter PostgreSQL, Q-DAG payloads, checkpoint files, logs, API responses, or source control.

A signed local checkpoint proves possession of the current local private key and integrity of the committed Q-DAG state. It does not prove the factual truth of application data and is not a network consensus statement.


### Witness durability and recovery security — retained in v4.20

The canonical local Q-DAG is written atomically with restrictive permissions where supported. Backup manifests hash every included file and independently validate the reconstructed Q-DAG root/node count. Recovery passwords are intentionally excluded from backups, preventing the backup package itself from becoming a self-contained decryption bundle.

Mizan witness nodes use hash commitments and omit raw text/full analysis payloads. This reduces unnecessary sensitive duplication but **does not make hashes anonymous** and is not a substitute for encryption, access control, selective disclosure, or zero-knowledge proofs. Runtime restore is not exposed over HTTP to reduce destructive remote operations.

Anonymous `/api/v1/ai/analyze` requests are intentionally prevented from appending to Q-DAG; immutable ledger growth from that route requires `ANALYZE` permission.

## v4.20 decision-safety boundary

`PROVISIONAL`, `INSUFFICIENT_EVIDENCE`, and `RESERVED` Qur'anic Mizan outputs are not authorization for punitive/adverse action. Applications consuming the API must preserve the status and verification requirement rather than converting a model score into a factual accusation. Hidden-heart, final faith, and final-destination claims remain outside the authorization model entirely.


## v4.21 Four-book Revelation Core

Normative reasoning is restricted to Al-Qur'an, Tawrat, Zabur, and Injil, with Al-Qur'an primary/Muhaimin. External research and historical metadata cannot contribute normative weight. The engine distinguishes scripture text from metadata and distinguishes a place mentioned in a passage from the place where that passage was revealed. Tawrat/Zabur/Injil transmitted textual-witness corpora are now bundled and seeded for corroboration only; they are not equated with the original revealed texts and cannot establish or reverse primary moral direction. See `REVELATION_SEMANTIC_CORE.md`.

## v4.22 revelation-source integrity

The active Asma runtime has no dependency on the deleted `asmaul-husna.json` or hand-authored Asma semantic profiles. This removes a silent manual-authority path. Tawrat/Zabur/Injil textual-witness corpora are locally bundled and seed-verified; runtime does not fall back to model memory or network retrieval, and their witness status cannot be promoted to original-revelation certainty. API inspection of Asma candidates does not promote candidates to theological certainty.

## Revelation source-integrity boundary

v4.23 preserves source class on every non-Quran witness record. `TEXTUAL_WITNESS` data cannot pass the primary normative source guard. Corroboration requires an admitted book, the textual-witness source class, and a local corpus. Witness channels cannot create/reverse moral direction, and a missing empirical bridge cannot be fabricated from textual similarity.

## v4.25 normative-integrity guard

The required language query profile is integrity-hashed during installation and must contain no action→verse table, moral direction, or moral score. The derived Native-Binding index stores the profile SHA-256. A language profile can influence retrieval only; it cannot independently issue a normative result.


## v4.26 scoring-integrity guard

The core semantic provider is prohibited from loading action-specific `vector`, `harm`, or `benefit` magnitude from `data/registries/action-semantics.json`. That registry remains only for non-core compatibility modules and tests until those consumers are migrated. Core RGBL/OUT scoring derives from native Revelation passage evidence.

Engineering parameters are isolated in `data/revelation/scoring-profile.json` with `normativeAuthority=false`, seeded explicitly, and fingerprinted together with `data/semantic/registry.json` in `REVELATION-INDEX::SCORING`. The scoring layer cannot create or reverse moral direction, fabricate scripture references, or convert an `UNRESOLVED` binding into a normative result.

## Event interpretation safety boundary

The event-language profile has `normativeAuthority=false`. Negated or embedded reported actions cannot fall back to moral binding as if they occurred. Permission/mistake context can invalidate structurally inferred theft labels. Same-event opposing Revelation relations trigger explicit conflict instead of a forced score. Event data sent to Witness/Q-DAG remains covered by hash-commitment-only privacy semantics.

## v4.28 Lifecycle integrity boundary

Lifecycle profiles have `normativeAuthority=false`, are seeded explicitly, and are fingerprinted by `REVELATION-INDEX::MORAL-LIFECYCLE`. The engine must fail closed rather than fabricate divine acceptance or forgiveness. Historical violations remain auditable in event/Q-DAG provenance after restorative events.

## v4.29 Grammar integrity boundary

`data/revelation/grammar-profile.json` is seeded and fingerprinted but has `normativeAuthority=false`. A profile edit requires derived-index rebuild. External lexicons, hidden action→verse mappings and promotion of heuristic roots to canonical roots are prohibited by release invariants.


## v4.30 ontology integrity boundary

`data/revelation/divine-ontology-profile.json` is seeded and fingerprinted with `normativeAuthority=false`. A changed profile requires derived-index rebuild/verification. External lexicons, human-curated Asma catalogs and cluster outputs cannot silently enter the normative path.
