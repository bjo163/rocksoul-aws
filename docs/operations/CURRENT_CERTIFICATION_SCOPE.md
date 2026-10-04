# AWS Current Certification Scope

This document is the current operator-facing certification scope for the AWS engine/API repository.

## Current repository scope

AWS certification covers the engine/package graph, API/runtime, SDK/contracts, PostgreSQL persistence, authentication/security, jobs/worker behavior, Witness/audit/provenance, backend deployment configuration, final certification, Docker image construction, and release evidence.

Product Web, XRP, CAB, and Flow browser applications are external consumers. Their UI builds, screenshots, browser presentation, localization, and accessibility certification are not AWS release gates and must not be used as dependencies for engine/API certification.

## Supported persistence

The supported current runtime persistence surface is:

- `postgres` for durable production/integration use;
- `file` for portable standalone operation;
- `memory` for ephemeral/test use.

SQLite and `better-sqlite3` are not part of the supported current runtime or dependency surface.

## Release evidence rule

A release candidate is certified only by mandatory gates completed against the exact candidate SHA. Queued, cancelled, historical, partial, local-only, or different-SHA results are not release evidence.

The authoritative full release lane is the self-hosted AWS CI workflow. Hosted/legal-corpus checks may provide supplemental or domain-specific evidence but do not replace the full exact-SHA certification gate.

## Historical documentation

Older audit, TODO, release-report, and certification documents may preserve statements that were true for earlier repository versions. Treat those statements as historical snapshots when they conflict with this current scope or `docs/TESTING.md`; they are not current runtime or release contracts.

## Active operational owners

- self-hosted certification and runner health: GitHub issue #71;
- backend Coolify staging/deployment and rollback: GitHub issue #24;
- PostgreSQL resilience/backup/recovery: GitHub issue #30;
- API/OpenAPI compatibility: GitHub issue #27;
- SDK/client compatibility: GitHub issue #32.
