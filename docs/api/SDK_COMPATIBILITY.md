# Universal API SDK Compatibility

## Source of truth

`docs/api/openapi.json` is the initial machine-readable API contract. Generated clients must not invent routes or response fields outside the canonical contract.

## Compatibility rules

- Additive request/response fields are preferred.
- Removing or renaming a public field requires an API versioning decision.
- Error codes are stable integration values; diagnostic messages are not.
- Authentication/session transport changes require contract tests for both bearer and cookie modes where supported.
- RID propagation is part of the security boundary and must remain explicit in client APIs.
- Safe idempotent requests may use bounded retry with timeout and cancellation support.
- Mutating requests must not be retried blindly unless the endpoint contract guarantees idempotency.

## Client smoke

A staging SDK smoke should cover health/readiness, login, authenticated identity, AI analysis, command submission where provisioned, and clean error handling for unauthorized requests.
