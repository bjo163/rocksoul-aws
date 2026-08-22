# Local Environments

MoonWitness OS provides three isolated PostgreSQL environments on the local workstation:

| Environment | Database | Purpose |
|---|---|---|
| Development | `moonwitness_development` | Daily development and destructive test data |
| Staging | `moonwitness_staging` | Demo and release-candidate validation |
| Production | `moonwitness_production` | Local production-shaped baseline; never used by automated smoke writes |

Each database has its own restricted application role, password, admin account, JWT secret, Witness key password, and runtime-data directory. Credentials live only in the gitignored `.env.<environment>.local` files. They must not be copied into tracked documentation, commits, screenshots, or CI logs.

## Applications and URLs

The launcher starts the API and both user interfaces together:

| Surface | URL |
|---|---|
| CAB (private operational application) | `http://127.0.0.1:4173/` |
| Public/home website | `http://127.0.0.1:4174/` |
| API | `http://127.0.0.1:8787/` |
| Health metadata | `http://127.0.0.1:8787/api/v1/health` |

The CAB login screen and authenticated header show the active environment. The health response reports the environment, database, storage driver, and release without exposing credentials.

After login, open **CASE WORKFLOW** (or choose **New Case** on Home) to complete the normal local flow from observation and evidence through analysis, human review, Witness commitment, and audit verification. Every mutation remains an explicit user action; the screen does not silently dispose a review or change evidence.

## Commands

Build the three applications before the first launch or after source changes:

```powershell
npm run build:api
npm run build:cab
npm run build:web
```

Start one environment at a time:

```powershell
npm run local:start
npm run local:start:staging
npm run local:start:production
```

Inspect or stop the active local stack:

```powershell
npm run local:status
npm run local:stop
```

Run the non-destructive-to-production workflow certificate:

```powershell
npm run local:certify
npm run local:certify:staging
```

The certificate logs in, observes a case, attaches evidence, persists analysis, completes the human-review transitions, and validates the Witness DAG. The script deliberately rejects `production`.

## Operational rules

- Stop the current stack before switching environments; all three stacks intentionally use the same local ports.
- Development is the default environment left running for interactive use.
- Staging may contain synthetic certification cases.
- Production receives schema/seed verification and admin bootstrap, but automated E2E writes are prohibited.
- Schema creation and evolution belong to the migration registry. Runtime repositories must not issue `CREATE TABLE`.
- Run `npm run db:verify` with the selected local environment loaded after persistence tests; a non-zero result means the environment is not certified.
