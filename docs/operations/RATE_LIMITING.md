# Rate limiting model

Cosmic uses bounded local rate limiting for development and single-node deployments. The runtime primitive is `src/security/rate-limiter.ts`.

Local memory buckets are not sufficient for a horizontally scaled deployment because each process has independent state. Before deploying more than one API instance, the limiter must move to a shared store or edge/service-level distributed enforcement.

Required production properties:
- independent limits for authentication, AI, writes, and general reads;
- bounded key cardinality and memory usage;
- `Retry-After` on rejected requests;
- stable request/correlation identifiers for diagnostics;
- no credentials or secrets as bucket keys;
- an explicit deployment decision for the shared limiter before scale-out.
