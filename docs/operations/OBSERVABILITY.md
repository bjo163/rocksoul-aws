# Cosmic Observability Contract

## Request diagnostics

Every API request should have a stable request ID and correlation ID. IDs must be safe to expose to operators and clients and must never encode credentials, tokens, cookies, or request bodies.

## Logs

Preferred production logs are structured and should capture:

- timestamp
- requestId
- correlationId
- method
- route template
- statusCode
- durationMs
- deployment/release identifier
- dependency failure class when applicable

Secrets that must never be logged include JWTs, refresh tokens, cookies, passwords, database URLs, private keys, and raw sensitive payloads.

## Health semantics

- `/api/v1/health`: operational diagnostic surface; production responses are intentionally restricted.
- `/api/v1/ready`: deployment readiness signal intended for Coolify/Traefik checks.

## Persistence diagnostics

Operators should be able to distinguish API process health from PostgreSQL connectivity, migration state, job processing, and Witness/Q-DAG integrity.

## Worker diagnostics

When a standalone worker is introduced, it must expose queue depth, running/failed/completed counters, retry state, and bounded shutdown status.
