# Cosmic 4.33.0 — Final Cleanup

## Cleaned

- Removed historical checkpoint/certification documents from the final distribution.
- Consolidated documentation into the canonical operational and architecture documents.
- Removed legacy/versioned certification scripts from the final package.
- Converted remaining test `.mjs` files to TypeScript.
- Removed generated build artifacts from the source tree.
- Updated repository, API, Web, and lockfile versions for the 4.33.0 release line.
- Moved action/rights/wealth semantic maps into `data/registries/action-semantics.json`.
- Removed keyword-based semantic classification from `src/justice/legal-analyzer.ts`.
- Added a reproducible release verification path covering contracts, UI, API, persistence recovery, backup/restore, and migration contracts.
- Added API E2E coverage for authenticated observe/analyze/resource/replay/audit and idempotent commands.
- Added checksum-manifest backup and safe restore for the portable file persistence driver.
- Removed SQLite from the supported runtime/test surface. The supported persistence drivers are `memory`, `file`, and `postgres`.

## Final release boundary

Cosmic 4.33.0 uses a framework-free HTTP transport and a deliberately small persistence surface:

- `memory` for ephemeral tests and short-lived helpers;
- `file` for portable local and single-node operation;
- `postgres` for durable multi-user, CI, staging, and production-style operation.

SQLite and its native `better-sqlite3` binding are not part of the supported 4.33.0 runtime or certification surface.

## Certification policy

The release certification suite must validate the supported runtime paths rather than deprecated or intentionally removed adapters. Full API data-driven coverage remains part of certification; local debugging may use targeted reproductions without weakening the full gate.
