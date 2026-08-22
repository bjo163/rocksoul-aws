# Release Notes — 4.16.0

## Distributed Witness Layer

This release extends the v4.15 Witness/Q-DAG foundation with cryptographically signed multi-node exchange and offline reconciliation.

### Added

- `src/ledger/distributed-witness.ts`
  - Ed25519 witness identities;
  - safe public identity export;
  - signed checkpoints;
  - trusted public-key verification;
  - threshold quorum evaluation;
  - signed witness bundles;
  - bundle verification/import;
  - multi-bundle reconciliation.
- `tests/distributed-witness.test.ts`
  - key separation;
  - signature validation and wrong-key rejection;
  - 2-of-N quorum behavior;
  - bundle round-trip;
  - tamper rejection;
  - two-node offline branch reconciliation;
  - explicit causal merge.
- `npm run test:witness` to execute both Q-DAG and distributed witness suites.

### Security boundary

Ed25519 signatures establish cryptographic authorship by a key holder; they do not establish semantic truth. Production trust must pin witness IDs to trusted public keys. Private keys are not serialized by the public identity helper.

### Compatibility

The v4.15 WitnessDag node/hash format remains unchanged. PostgreSQL remains the operational database/projection layer; this release does not yet persist witness identities, signatures, or bundles to dedicated PostgreSQL tables.

### Verification

The Q-DAG and Distributed Witness tests pass on Node.js 22 with TypeScript 5.8.x.
