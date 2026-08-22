# Local Environments

MoonWitness OS provides three isolated PostgreSQL environments on the local workstation:

| Environment | Database | Purpose |
|---|---|---|
| Development | `moonwitness_development` | Daily development and destructive test data |
| Staging | `moonwitness_staging` | Demo and release-candidate validation |
| Production | `moonwitness_production` | Local production-shaped baseline; never used by automated smoke writes |

Each database has its own restricted application role, password, RID-bound admin account, JWT secret, Witness key password, and runtime-data directory. Credentials live only in the gitignored `.env.<environment>.local` files. They must not be copied into tracked documentation, commits, screenshots, or CI logs. `MOONWITNESS_ADMIN_RID` is required by the repeat-safe admin bootstrap.

## Applications and URLs

The launcher starts the API and all four human-facing applications together:

| Surface | URL |
|---|---|
| CAB (private operational application) | `http://127.0.0.1:4173/` |
| Public/home website | `http://127.0.0.1:4174/` |
| XRP (authenticated public RID workspace) | `http://127.0.0.1:4175/` |
| Flow (governed workflow studio) | `http://127.0.0.1:4176/` |
| API | `http://127.0.0.1:8787/` |
| Health metadata | `http://127.0.0.1:8787/api/v1/health` |

The CAB login screen and authenticated header show the active environment. Outside production, health reports environment, database, storage driver, and release without credentials. Production public health reports only status/release; the launcher authenticates internally before checking detailed health.

After an administrator's RID is first bound, all prior sessions are revoked. Log out and sign in again so CAB receives the new RID claim.

After login, open **CASE WORKFLOW** (or choose **New Case** on Home) to complete the normal local flow from observation and evidence through analysis, human review, Witness commitment, and audit verification. Every mutation remains an explicit user action; the screen does not silently dispose a review or change evidence.

## Commands

Build all applications before the first launch or after source changes:

```powershell
npm run build:api
npm run build:cab
npm run build:web
npm run build:xrp
npm run build:flow
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

- Stop the current stack before switching environments; all three database environments intentionally use the same five local application ports.
- Development is the default environment left running for interactive use.
- Staging may contain synthetic certification cases.
- Production receives schema/seed verification and admin bootstrap, but automated E2E writes are prohibited.
- Schema creation and evolution belong to the migration registry. Runtime repositories must not issue `CREATE TABLE`.
- Run `npm run db:verify` with the selected local environment loaded after persistence tests; a non-zero result means the environment is not certified.
