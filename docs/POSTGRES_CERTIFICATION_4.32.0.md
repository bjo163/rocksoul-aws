# PostgreSQL Certification — MoonWitness OS 4.32.0

Certification date: **2026-08-22**  
Engine: **PostgreSQL 18.4**  
Scope: migration, corpus seed, integrity, durable sessions, restart persistence, and backup/restore baseline.

## Result

**PASS — baseline PostgreSQL readiness.** This is not yet a high-availability, point-in-time-recovery, or high-concurrency production certificate.

| Check | Result |
|---|---:|
| Schema migration | PASS — all three local environments at schema version 7 |
| Durable auth sessions | PASS — rotating refresh-token hashes and revocation table installed with least-privilege application roles |
| Administrator RID binding | PASS — all three local admins have explicit RID and stale sessions were revoked |
| Seed installation | PASS — 18,579 persisted seed/derived entities |
| Seed source verification | PASS — 106/106 sources |
| Qur'an corpus | PASS — 6,236 ayat and 114 surahs |
| Tawrat witness corpus | PASS — 5,852 passages |
| Zabur witness corpus | PASS — 2,461 passages |
| Injil witness corpus | PASS — 3,779 passages |
| Audit chain after seed | PASS — 18,579 records |
| Event chain | PASS |
| Development E2E + post-write integrity | PASS — observe, evidence, analysis, review, Witness; audit/event chains valid |
| Staging E2E + post-write integrity | PASS — observe, evidence, analysis, review, Witness; audit/event chains valid |
| Production-simulation read boundary | PASS — minimal public health; authenticated detailed health and RID workspace |
| Runtime dataset verification | PASS — 106 loaded datasets and all 27 required runtime datasets in each environment |
| Separate-process restart smoke | PASS — two consecutive runs |
| Custom-format backup | PASS |
| Restore into staging | PASS |
| Restored source checksums | PASS — 106/106 sources |
| Restored audit/event heads | PASS — identical to source backup |

## Database roles

- `moonwitness_development`: destructive testing and migration certification.
- `moonwitness_staging`: release/demo validation and restore drills.
- `moonwitness_production`: production data only; never used for destructive tests.

All three databases are hosted by the same local PostgreSQL service for this certificate. Credentials are supplied through process environment variables and are not committed to the repository.

## Defect corrected during certification

PostgreSQL `JSONB` normalizes object-key ordering. The former hash serializer depended on insertion order, so valid persisted audit payloads could fail verification after read-back. Event and audit hashing now use recursively key-sorted canonical JSON, with a regression test covering reordered nested objects.

The PostgreSQL smoke test is aligned with the current four-book corpus entity types. It includes a 32-write concurrent audit regression. Database verification emits its diagnostic report before returning a failing exit code.

During three-environment validation, concurrent runtime-data updates exposed an audit append race: multiple records written in the same millisecond could select the same previous hash. Schema version 6 adds a database-assigned chain position, and PostgreSQL audit writes now run inside a transaction protected by an advisory transaction lock. Schema version 7 adds durable revocable sessions with rotating refresh-token hashes. Entity, evidence, event, projection, and direct audit appends use the same serialized boundary. Development, staging, and production-shaped local databases pass schema-7 and full seed-integrity verification; development and staging also pass post-write E2E verification.

The backend closure audit additionally bound every local administrator to `RID-MOONADMIN-001`, revoked pre-binding sessions, verified login/workspace access in all three environments, and confirmed the production-simulation disclosure boundary. Public RID claims are rejected; subsequent RID bindings are admin-only, immutable, and auditable.

Environment launch and certification commands are documented in `LOCAL_ENVIRONMENTS.md`. Production is intentionally excluded from the E2E script.

## Automated recurrence

`npm run test:postgres` is the explicit integration command. GitHub Actions runs it against an isolated PostgreSQL 18 service, independent of the default file/SQLite lanes.

## Remaining production gates

- Sustained multi-process load testing beyond the corrected concurrent audit-append race.
- Forced transaction-failure and deadlock recovery drills.
- Point-in-time recovery, retention, encryption, TLS, and off-host backup policy.
- Referential-integrity and deletion/retention policy for evidence and Witness records.
- Managed deployment sizing, connection limits, monitoring, and incident response.
