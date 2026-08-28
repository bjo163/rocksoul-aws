# Staging smoke procedure

Run this against the deployed staging base URL only.

1. `GET /api/v1/ready` must return a successful readiness response.
2. Authenticate with staging-owned credentials; never use repository fixtures for credentials.
3. Verify `GET /api/v1/auth/me` returns the expected RID/session shape.
4. Run one read/query operation.
5. Run one idempotent write with an explicit idempotency key and replay it; the second call must converge on the same result.
6. Run one AI analysis request and verify request/correlation IDs are present while secrets are absent.
7. Verify `/api/v1/health` exposes only the intended unauthenticated release/status metadata.
8. Verify the Coolify container healthcheck uses `/api/v1/ready` and PostgreSQL health gating.

A staging smoke result is environment evidence, not a substitute for the full `main` certification workflow.
