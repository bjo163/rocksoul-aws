# Compatibility Policy

## Semver Policy

This repository follows semantic versioning for all `@moonwitness/*` packages.

- **MAJOR** — breaking API changes, removal of previously documented exports, or changes to established input/output contracts.
- **MINOR** — additive changes: new exports, new optional parameters, new interface properties, or new functions that do not alter existing behavior.
- **PATCH** — bug fixes, internal refactors, documentation updates, and changes that preserve all existing public signatures.

The current release series is `4.x`. The root `package.json` version is the single source of truth for all workspace packages.

## Deprecation Policy

- Symbols marked for removal remain functional for **2 minor versions** before they are deleted.
- Deprecated symbols must emit a runtime warning when called in non-test environments.
- Deprecation notices are recorded in `docs/RELEASE_NOTES_<version>.md` and in the deprecated symbol's JSDoc (where applicable).
- No symbol is removed in a patch release.

## Consumer Support

- **Node 20 LTS** (Active LTS) and **Node 26 LTS** (Current LTS) are supported runtime targets.
- Package exports use the `"default"` condition to maximize compatibility across ESM and CJS consumers.
- Type declarations (`"types"`) are shipped alongside every published artifact.

## Architecture Boundary

No package under `packages/` may import `fastify`, `express`, `hono`, `apps/api`, or the legacy root `src/` tree. This boundary is enforced by `scripts/architecture-boundary.mjs` and validated in CI. The API compatibility adapter may import only the explicit root-runtime modules in that script's allowlist; the check reports the current import count so migration progress is visible.

## Freeze Process

1. A symbol is proposed for freeze in `docs/PACKAGE_API.md`.
2. The freeze is ratified in a minor release and recorded in `docs/COMPATIBILITY_POLICY.md`.
3. After freeze, any change to the symbol requires a major version bump unless the change is strictly additive and backward-compatible.
4. Consumers may rely on the documented export surface without guarding against removal in minor or patch releases.
