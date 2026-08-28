# Rollback Procedure: Fastify to Native HTTP

This document describes the procedure for rolling back from the Fastify transitional runtime to the native Node.js HTTP server during the 4.33.0 release candidate rehearsal and any production incident requiring runtime reversion.

## Scope

- Applies to the Fastify migration release candidate (`COSMIC_FASTIFY_RUNTIME=1`).
- Native HTTP remains the production default. Fastify is a transitional surface pending route parity.
- Database schema is unchanged between runtimes. No migration is required.

## Pre-Rollback Checklist

Complete all items before executing the rollback procedure.

- [ ] Confirm `COSMIC_FASTIFY_RUNTIME=0` (or unset) on all production instances.
- [ ] Verify rollback rehearsal passed: `node scripts/rollback-rehearsal.mjs` completed with `passed: true`.
- [ ] Verify release candidate manifest is green: `scripts/.release-candidate-manifest.json` shows `passed: true`.
- [ ] Confirm no in-flight migrations or schema changes are pending.
- [ ] Ensure database backups are current (`npm run db:backup`).
- [ ] Confirm monitoring dashboards and alert routing are operational.
- [ ] Notify on-call team and escalation contacts (see Escalation below).
- [ ] Record current Fastify metrics baseline (request rate, error rate, latency) for post-rollback comparison.

## Step-by-Step Rollback Procedure (Fastify to Native HTTP)

### 1. Stop Fastify Runtime

On each instance running Fastify:

```bash
# If running under a process manager
pm2 stop cosmic-api-fastify

# Or if running directly
pkill -f "COSMIC_FASTIFY_RUNTIME=1"
```

Confirm the process has stopped:

```bash
curl -sf http://127.0.0.1:8787/health || echo "Fastify is down"
```

### 2. Verify Port Release

Wait for the API port (default `8787`) to be released. On Windows:

```powershell
Start-Sleep -Seconds 3
Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $_.LocalPort -eq 8787 }
```

On Linux:

```bash
sleep 3
ss -tlnp | grep 8787 || echo "Port released"
```

If the port remains occupied after 10 seconds, escalate to the platform team for forced process termination.

### 3. Activate Kill-Switch

Set the environment variable to disable Fastify mode:

```bash
COSMIC_FASTIFY_RUNTIME=0
```

Unset or set to `0` on all instances before restarting. Do not leave `COSMIC_FASTIFY_RUNTIME=1` in any environment.

### 4. Start Native HTTP Server

Start the native server using the standard startup path:

```bash
npm run build:packages
npm run build:api
node apps/api/dist/apps/api/src/server.js
```

Or via the local orchestration script:

```bash
npm run local:start
```

### 5. Verify Native Health and Readiness

```bash
curl -sf http://127.0.0.1:8787/api/v1/health
curl -sf http://127.0.0.1:8787/api/v1/ready
```

Expected response for `/api/v1/health`:

```json
{ "ok": true }
```

Expected response for `/api/v1/ready` includes runtime metadata confirming native mode.

### 6. Verify Data Integrity

Confirm persistence and witness data are intact after runtime switch:

```bash
# Verify data directory exists and witness DAG is readable
node -e "const fs=require('fs'); const dag=JSON.parse(fs.readFileSync('.data/witness/qdag.json','utf8')); console.log('Witness DAG nodes:', dag.nodes?.length ?? 1);"
```

Confirm database connectivity:

```bash
npm run db:verify
```

### 7. Verify API Contract

Run the API route inventory and contract tests to confirm no regressions:

```bash
npm run test:api-route-inventory
npm run test:api-cookie-session
```

### 8. Monitor Post-Rollback

Observe the following metrics for at least 15 minutes:

- Error rate (5xx responses)
- Request latency p50/p99
- Witness DAG append rate
- Authentication success rate
- Queue depth (`npm run test:worker-queue` if anomalies are observed)

If error rate exceeds baseline by more than 2x, escalate immediately.

## Database Migration Considerations

- **No migration is expected** when rolling back from Fastify to native HTTP. The Fastify transitional runtime shares the same persistence layer and event store.
- If a future Fastify parity release introduces schema changes, those migrations must be reversed before rollback.
- Always verify `npm run db:verify` passes after rollback.
- If using PostgreSQL, confirm `STORAGE_DRIVER=postgres` and connection pool health: `npm run db:runtime-verify`.

## Post-Rollback Verification Steps

1. **Health checks pass** on all instances.
2. **Data integrity confirmed**: witness DAG, persistence store, and event chain are intact.
3. **API contracts pass**: route inventory and core integration tests succeed.
4. **No orphan processes**: no Fastify processes remain running.
5. **Environment variables are clean**: `COSMIC_FASTIFY_RUNTIME=0` or unset everywhere.
6. **Metrics return to baseline**: error rate and latency match pre-rollback levels within 15 minutes.
7. **Logs reviewed**: no unexpected stack traces or unhandled rejections in native server logs.

## Escalation Contacts and Process

1. **Platform on-call**: first responder for port conflicts, process management, and infrastructure issues.
2. **Engine lead**: required if rollback is triggered by data integrity concerns or witness DAG anomalies.
3. **Release manager**: must approve any second rollback attempt or extended maintenance window.

Escalation path:

- If native server fails to start within 5 minutes of port release, escalate to platform on-call.
- If data integrity checks fail (`db:verify` or witness DAG unreadable), escalate to engine lead immediately. Do not attempt further runtime switches without review.
- If metrics do not return to baseline within 30 minutes, convene a war room with platform, engine, and release management.

## Rehearsal

Before any production rollback, execute the automated rehearsal:

```bash
node scripts/rollback-rehearsal.mjs
```

The rehearsal must complete in under 5 minutes and produce `scripts/.rollback-rehearsal-report.json` with `passed: true`.
