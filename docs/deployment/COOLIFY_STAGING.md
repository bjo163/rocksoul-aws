# Coolify Staging Deployment

## Topology

```text
Coolify
├── PostgreSQL 18
├── Cosmic API
└── Cosmic Web
```

The API uses `STORAGE_DRIVER=postgres` and mounts `/data` for runtime/Witness state. Web and API expose port `3000` internally; Coolify/Traefik should terminate TLS and route domains.

## Required staging secrets

Configure these in Coolify, not in Git:

- `POSTGRES_PASSWORD`
- `JWT_SECRET`
- `MOONWITNESS_ADMIN_RID`
- `MW_CORS_ORIGINS`
- `MW_COOKIE_SECURE=1`
- `MW_TRUST_PROXY=1`

Witness key material/password configuration must also be provided through the protected deployment secret mechanism defined by the release environment.

## Validation

1. PostgreSQL reports healthy.
2. API reports ready at `/api/v1/ready`.
3. Web is reachable over HTTPS.
4. Run the API smoke sequence from `docs/api/API_CONTRACT.md`.
5. Verify persistence across an API restart.
6. Run Witness diagnostics and backup verification.
7. Confirm logs contain request/correlation IDs without secrets.

## Rollback

Rollback the application image first when the schema remains backward compatible. When a schema change is not backward compatible, restore the database into a disposable environment and rehearse the recovery sequence in `docs/operations/POSTGRES_RECOVERY.md` before production rollback.
