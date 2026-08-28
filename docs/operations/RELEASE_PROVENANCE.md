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
- deterministic `COSMIC_RELEASE_PROVENANCE_V1` artifact containing the lockfile SBOM
  and package-manifest SHA-256 checksums
- immutable local container image identity (`COSMIC_CONTAINER_IMAGE_V1`) after the
  Docker build; publishing a registry image is not required to record this evidence

A release is not certified from a different or floating ref. `dev` is the integration trunk; `main` is release-only.

## CI evidence artifact

Cosmic CI writes, verifies, and uploads `cosmic-release-evidence-<sha>` for every
candidate attempt. It contains `release-provenance.json` and, when the Docker build
reaches completion, `container-image.json`. The latter records the source SHA, CI
run identity, immutable Docker image ID, and creation timestamp. It is an image
identity for the locally-built candidate; a registry digest is additionally recorded
only if a future workflow publishes the image.
