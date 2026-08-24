# MoonWitness Package Standard — v4.32

This document defines when and how code becomes a workspace package. The goal is to keep Cosmic/MoonWitness modular without creating packages for every folder.

## 1. Package eligibility

Create a package only when a capability is:

1. **Mature** — stable responsibilities and public API already exist.
2. **Cohesive** — the package has one clear purpose and vocabulary.
3. **Reusable** — used by two or more applications, or intentionally defined as a platform boundary.
4. **Dependency-bounded** — its dependency direction can be stated without circular imports.
5. **Testable** — package behavior can be tested independently of an application screen.
6. **Owned** — one team/domain can explain why the package exists.

Do **not** create a package just because a directory is large.

## 2. Standard package categories

```text
contracts/    shared contracts and validation; no runtime infrastructure
kernel/       universal domain/runtime primitives and model registry
revelation/   Revelation, corpus, Asma, ontology, grammar, binding
persistence/  storage providers and repositories
data-access/  actor-aware data access facade
sdk/          application/API client contract facade
ui/           shared React/governed visual primitives
```

Application-specific behavior stays in `apps/*`.

## 3. Standard layout

Each mature package should converge on:

```text
packages/<name>/
├─ package.json
├─ README.md
├─ src/
│  ├─ index.ts
│  ├─ <domain modules>/
│  └─ internal/            # optional, never part of public API
├─ test/                    # package-local tests when useful
├─ data/                    # only when the package is the canonical owner of domain data
└─ docs/                    # only package-specific design notes
```

Optional files:

```text
CHANGELOG.md
LICENSE
```

Package-owned `data/` is allowed only for mature, domain-specific canonical datasets whose ownership is explicit in the package README and certification suite. Generated runtime state, backups, caches, and application-specific datasets must remain outside packages.

## 4. Public entrypoint rule

`src/index.ts` is the only supported import surface for other packages/apps.

Good:

```ts
import { propheticRelationsSnapshot } from '@moonwitness/revelation';
```

Bad:

```ts
import { propheticRelationsSnapshot } from '../../../src/revelation/prophetic-relations.js';
```

Internal modules may import each other directly inside the same package.

## 5. Dependency direction

The default direction is:

```text
contracts
   ↑
   ├── kernel
   ├── revelation
   ├── persistence
   └── ui
        ↑
   data-access
        ↑
       sdk
        ↑
      apps/api
        ↑
  apps/cab / xrp / web / flow
```

Rules:

- `contracts` depends on nothing in MoonWitness.
- `kernel` does not depend on apps.
- `revelation` does not depend on CAB/XRP/Flow/Web.
- `persistence` does not depend on UI or app code.
- `ui` does not depend on persistence.
- Apps may compose packages but must not redefine package responsibilities.
- Avoid circular package dependencies. If one appears, move shared concepts downward or into `contracts`.

## 6. Package API rules

Every exported symbol must be intentional.

A package should expose:

- stable types/contracts;
- stable domain functions/classes;
- explicit factory/configuration entrypoints;
- documented invariants and boundaries.

Do not export internal helpers merely to make tests convenient.

## 7. Data rules

Data ownership follows domain boundaries rather than a single repository-wide folder rule.

Use root `data/` for datasets shared across domains or infrastructure-wide snapshots. A mature package may own canonical domain data under its own `data/` directory when all of the following are true:

- the package is the clear semantic owner;
- the dataset is versioned and deterministic;
- the public package boundary documents the dataset;
- persistence/bootstrap consumes that source explicitly;
- no second copy remains under root `data/`;
- a certification test prevents duplicate or missing ownership.

Canonical Revelation seed data is therefore owned by `@moonwitness/revelation`:

```text
packages/revelation/data/prophets.json
packages/revelation/data/knowledge/prophet-scripture-index.json
packages/revelation/data/knowledge/prophetic-events.json
      ↓
@moonwitness/persistence bootstrap
      ↓
REVELATION / KNOWLEDGE entities
      ↓
PostgreSQL / Universal Entity Graph
```

Do not create package-owned copies of data merely for convenience. A migration is complete only when the old source is removed and the new owner is protected by tests.

## 8. Seed rules

Seed data must be:

- deterministic;
- hash/provenance aware;
- idempotent;
- typed;
- independently verifiable;
- safe to install into PostgreSQL and file/SQLite test stores.

Never turn an uncertain or research dataset into a normative structured seed merely because a package can parse it.

## 9. Versioning rules

Workspace packages currently share the repository product version (`4.32.x`).

When the workspace becomes independently published, package versions may diverge, but compatibility rules must remain explicit.

Breaking API changes require:

- contract update;
- migration note;
- dependent test updates;
- certification.

## 10. Migration rules

Migrate in this order:

```text
existing stable module
        ↓
package facade
        ↓
package entrypoint imports
        ↓
application imports migrated
        ↓
tests moved/expanded
        ↓
old path removed
```

A compatibility facade is acceptable temporarily. It is not the final architecture.

Never mass-move a large directory before import and runtime dependencies have been mapped.

## 11. Testing standard

Every package must have at least one of:

- package-local unit/contract tests;
- an existing repository certification suite that proves the public boundary;
- integration tests where the package owns infrastructure.

For packages touching persistence, Revelation corpus, security, or governance, boundary tests are mandatory.

Package-owned canonical data additionally requires an ownership regression test that proves the old path is absent.

## 12. Documentation standard

Every package README must answer:

1. What does this package own?
2. What does it explicitly not own?
3. What is the public entrypoint?
4. What are the major dependencies?
5. What tests certify it?
6. What migration/compatibility boundary currently exists?

## 13. Naming standard

Use nouns for capability packages:

```text
contracts
kernel
revelation
persistence
data-access
sdk
ui
```

Do not create names such as:

```text
utils-v2
helpers
common2
engine-final
misc
shared-stuff
```

Domain engines that are not yet package-worthy remain internal modules until they satisfy the package eligibility criteria.

## 14. Current migration target

The next mature package boundaries are:

```text
@moonwitness/kernel
@moonwitness/revelation
```

followed by selective extraction of other stable domains only when their dependency graph is clean.

The objective is **fewer, stronger packages**, not maximum package count.
