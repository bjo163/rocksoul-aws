# @moonwitness/witness

Host-neutral Witness primitives for MoonWitness integrations.

This package owns the immutable, content-addressed Witness DAG and its
classical cryptographic commitments. It includes Mizan commitments,
checkpoints, signatures, key lifecycle helpers, local persistence, backup and
distributed bundle transport. It stores commitments and metadata only; raw
application payloads remain in the host persistence layer.

The legacy `src/ledger` module remains the compatibility surface while hosts
migrate imports to this package.
