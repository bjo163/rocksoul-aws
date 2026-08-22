# Release Notes — 4.17.0

## Distributed Witness persistence and transport

v4.17.0 extends the verified Q-DAG/Distributed Witness foundation with durable projection schema and transport primitives while keeping cryptographic claims bounded to implemented behavior.

### Added

- schema migration `0005_distributed_witness_projection` for witness nodes, signed checkpoints and public-key lifecycle metadata;
- `PostgresWitnessProjectionStore` for Q-DAG hydration/projection;
- `WitnessKeyring` with ACTIVE, SUPERSEDED and REVOKED states;
- deterministic Merkle inclusion proof generation and verification;
- integrity-checked chunked signed-bundle encoding/assembly;
- `WitnessTransportService` reusable by HTTP or a future standalone worker;
- witness status/proof/export/import/queued-import API routes;
- `WITNESS_IMPORT_CHUNKS` persistent job handler;
- `SignatureProvider`/registry abstraction with Ed25519 as the only enabled implementation;
- v4.17 witness regression tests and synchronized canonical documentation.

### Cryptographic boundary

Q-DAG content hashing and Merkle proofs use SHA-256. Witness signatures use Ed25519. The provider abstraction prepares algorithm agility but does not itself provide post-quantum security. No physical quantum-entanglement or quantum-computing security claim is made.

### Verification

`npm run test:witness` passes the Q-DAG, distributed-witness, and v4.17 transport/key/proof suites. PostgreSQL migration execution requires a live PostgreSQL environment and is documented as environment-dependent rather than simulated.
