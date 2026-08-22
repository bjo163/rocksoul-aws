# MoonWitness OS 4.15.0

## Witness Q-DAG foundation

- Added `WitnessDag`, a zero-dependency content-addressed multi-parent cryptographic DAG.
- Added deterministic SHA-256 canonical hashing and Merkle-root checkpoints.
- Added concurrent branch + causal merge support.
- Added import verification, tamper detection, ancestor traversal, snapshots, and full DAG integrity verification.
- PostgreSQL remains the operational projection/query store while the DAG becomes the portable cryptographic history primitive.
- Explicitly documents that `Q-DAG` is a project codename: this release does not claim physical quantum entanglement or post-quantum security.
- Added `npm run test:qdag`.
