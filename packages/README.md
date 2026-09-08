# AWS Engine Packages

## **CAPABILITIES, NOT RANDOM FOLDERS.**

> **/// CANONICAL FACADE: @moonwitness/aws-engine ///**

MoonWitness packages provide the technical substrate used by AWS: contracts, persistence, jobs, evidence, orchestration, Mizan, temporal/semantic utilities, and API-facing services. `@moonwitness/cosmic-engine` remains only as a deprecated compatibility bridge during migration.

Packages are capability boundaries, not arbitrary folders.

Key package groups:

- contracts and kernel/domain contracts;
- TSE/temporal, semantic, Revelation, Mizan, and explanation engines;
- `cosmic-engine` host-neutral facade;
- `orchestrator` reusable workflows;
- persistence/data-access adapters;
- jobs/worker semantics;
- Witness/integrity capabilities;
- SDK consumer contracts.

Product UI packages are not part of Cosmic. Web/CAB/XRP/Flow presentation belongs to product repositories that consume Cosmic packages or API/SDK contracts.

See [`docs/PACKAGE_ARCHITECTURE.md`](../docs/PACKAGE_ARCHITECTURE.md) and [`docs/PACKAGE_STANDARD.md`](../docs/PACKAGE_STANDARD.md) before creating or extracting a package.
