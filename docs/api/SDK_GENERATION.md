# SDK generation and compatibility policy

The OpenAPI document at `docs/api/openapi.json` is the source contract for generated or manually maintained clients.

Release rules:
- SDK requests must preserve `/api/v1` versioning.
- Retry behavior must be safe for idempotent operations or requests carrying an idempotency key.
- Error decoding uses the stable `error` code; production diagnostic messages are optional.
- Authentication transport is bearer or HTTP-only cookie according to route policy.
- SDK releases are compatible with the active API major/minor contract unless a deprecation or breaking-version decision is recorded.
- The SDK must never embed production credentials or default localhost endpoints.

Before 5.0.0, the repository must have one canonical generation/verification command and a compatibility fixture for every public route class.
