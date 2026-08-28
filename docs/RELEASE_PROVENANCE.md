# Release provenance and SBOM

`npm run release:provenance` emits the deterministic
`COSMIC_RELEASE_PROVENANCE_V1` manifest to stdout. It contains the exact Git
SHA, release version, npm lockfile component inventory (SBOM), and SHA-256
checksums for the root and workspace package manifests.

Persist a candidate artifact with:

```sh
npm run release:provenance -- --output artifacts/release-provenance.json
npm run release:provenance -- --verify artifacts/release-provenance.json
```

The integrity field hashes a sorted JSON payload. Verification detects edits to
release identity, SBOM components, or artifact checksums. It does not replace
signature/key custody, image-digest recording, or deployment attestation.
