# Cosmic 4.33.0 — Coolify deployment

This stack is the initial deployment target for Cosmic 4.33.0.

## Services

- `postgres`: durable PostgreSQL 18 data store.
- `api`: Universal HTTP API, backed by PostgreSQL and a persistent local `/data` volume for single-node Witness/Q-DAG state and runtime data.
- `web`: public Cosmic web application.

SQLite is not part of this deployment.

## Coolify setup

Create a Docker Compose application in Coolify using:

`deploy/coolify/docker-compose.yml`

Set the environment variables from `deploy/coolify/.env.example` as secrets/variables in Coolify.

Recommended public domains:

- API: `api.<your-domain>`
- Web: `<your-domain>`

Expose port `3000` for both the API and Web services. Coolify/Traefik should terminate TLS and route traffic to the selected service.

## First deployment validation

1. PostgreSQL becomes healthy.
2. API becomes healthy at `/api/v1/health`.
3. API uses `STORAGE_DRIVER=postgres`.
4. Web container starts on `0.0.0.0:3000`.
5. Run the API smoke test against the public API hostname.
6. Verify migrations/seed state before production traffic is enabled.

## Persistence

- PostgreSQL volume: `cosmic-postgres`.
- API runtime/Witness volume: `cosmic-api-data` mounted at `/data`.

Back up both PostgreSQL and the API Witness data before destructive maintenance.

## Current scope

This is intentionally the first stage: API + Web + PostgreSQL. A dedicated worker service should be added only after the repository exposes a stable standalone worker entrypoint.
