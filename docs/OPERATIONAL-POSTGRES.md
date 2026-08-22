# PostgreSQL Operational State

When `STORAGE_DRIVER=postgres`, MoonWitness stores authentication and idempotency state in PostgreSQL:

- `auth_users`: hashed passwords, roles, RID, active state.
- `auth_revoked_tokens`: SHA-256 token revocation records.
- `idempotency_records`: request hash, response status/body and creation time.

No default admin password is seeded. Provision an administrator explicitly:

```bash
MOONWITNESS_ADMIN_USERNAME=admin \
MOONWITNESS_ADMIN_PASSWORD='use-a-long-random-password' \
STORAGE_DRIVER=postgres \
npm run auth:bootstrap
```

The legacy JSON files remain available only for `file`/`sqlite` development and regression tests.
