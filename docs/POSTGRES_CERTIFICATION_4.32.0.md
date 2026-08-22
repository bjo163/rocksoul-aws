# PostgreSQL Certification — MoonWitness OS 4.32.0

Certification date: **2026-08-22**  
Engine: **PostgreSQL 18.4**  
Scope: migration, corpus seed, integrity, restart persistence, and backup/restore baseline.

## Result

**PASS — baseline PostgreSQL readiness.** This is not yet a high-availability, point-in-time-recovery, or high-concurrency production certificate.

| Check | Result |
|---|---:|
| Fresh schema migration | PASS — schema version 5 |
| Seed installation | PASS — 18,570 canonical entities |
| Seed source verification | PASS — 106/106 sources |
| Qur'an corpus | PASS — 6,236 ayat and 114 surahs |
| Tawrat witness corpus | PASS — 5,852 passages |
| Zabur witness corpus | PASS — 2,461 passages |
| Injil witness corpus | PASS — 3,779 passages |
| Audit chain after seed | PASS — 18,570 records |
| Event chain | PASS |
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

The PostgreSQL smoke test was also aligned with schema version 5 and the current four-book corpus entity types. Database verification now emits its diagnostic report before returning a failing exit code.

## Automated recurrence

`npm run test:postgres` is the explicit integration command. GitHub Actions runs it against an isolated PostgreSQL 18 service, independent of the default file/SQLite lanes.

## Remaining production gates

- Concurrent append/idempotency/load testing across multiple API and worker processes.
- Forced transaction-failure and deadlock recovery drills.
- Point-in-time recovery, retention, encryption, TLS, and off-host backup policy.
- Referential-integrity and deletion/retention policy for evidence and Witness records.
- Managed deployment sizing, connection limits, monitoring, and incident response.
