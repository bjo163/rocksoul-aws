# Adapters

Applications construct infrastructure and translate transport commands. The API owns HTTP/Fastify, authentication, validation, serialization, persistence composition, and witness wiring. Engine packages remain host-neutral. Persistence exposes ports while file/Postgres implementations live below the persistence boundary. CLI and workers should consume `@moonwitness/intelligence` and the same capability/workflow packages as the API.

The current API route tree is still a compatibility adapter and is being split incrementally under existing route-inventory tests; no engine package imports it.
