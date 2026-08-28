# Fastify Rollback Procedure

## Kill-Switch

Set the environment variable to revert to the native HTTP runtime immediately:

```bash
export COSMIC_FASTIFY_RUNTIME=0
```

No code changes or redeployments are required if the flag is already wired into the entrypoint.

## Rollback Steps

1. Set `COSMIC_FASTIFY_RUNTIME=0` in the deployment environment.
2. Restart the API process.
3. Confirm the process is listening on the expected port using `curl http://<host>:<port>/api/v1/health`.
4. Verify the response body contains `"status":"ok"` and `"release":"4.33.0"`.
5. Check logs for any Fastify-related warnings or errors. There should be none because the runtime should not initialize Fastify when the flag is `0`.

## Verification After Rollback

- `GET /api/v1/health` returns 200 with `{ status: 'ok', release: '4.33.0', ... }`.
- `GET /api/v1/ready` returns 200 with `{ status: 'ready', release: '4.33.0', storageDriver: 'file'|'postgres' }`.
- All existing API routes under `/api/v1/*` respond as documented in the native HTTP contracts.
- No new `fastify` or `@fastify` modules are loaded (check process tree and module list if needed).
