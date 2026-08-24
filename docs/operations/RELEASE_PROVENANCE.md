# Release Provenance Contract

Every certified release must be traceable to one exact Git commit SHA.

Required evidence:

- source repository and exact SHA
- self-hosted runner identity (`cosmic`)
- Node/npm/runtime versions
- dependency integrity result
- full certification result
- build/container result
- PostgreSQL integration result
- release artifact checksums/SBOM when available

A release is not certified from a different or floating ref. `dev` is the integration trunk; `main` is release-only.
