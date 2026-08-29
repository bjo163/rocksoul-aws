# Cosmic Architecture — Current Repository State (Phase 1 Baseline Audit)

## 1. Executive Summary

Cosmic (Moonwitness OS) is an Intelligent Engine Platform designed for deterministic moral-semantic reasoning, astronomical time-factor evaluation (TSE), divine revelation grounding, distributed Merkle witness auditing (QDAG), and multi-domain analytical intelligence.

This document establishes the official Phase 1 baseline audit for the **Master Architecture Refactor & Packageization Task** on the `dev` branch.

---

## 2. Workspace Topography

The repository is structured as a TypeScript ES2022 / NodeNext monorepo containing 18 workspace packages, 1 application host (`apps/api`), legacy source directories (`src/`), and a contract-driven test suite.

```
cosmic/
├── apps/
│   └── api/                     # Host API server (Fastify staging + native HTTP router)
├── packages/
│   ├── contracts/               # L0: Core DTOs, schemas, canonical types
│   ├── persistence/             # L1: Data layer (Memory, File, PostgreSQL, config-loader)
│   ├── observability/           # L1: Tracing, metrics, redaction, telemetry
│   ├── security/                # L1: RBAC matrix, JWT/Cookie auth, rate limiter
│   ├── domains/                 # L2: 10 social & state domain profile evaluators
│   ├── witness/                 # L2: QDAG, Merkle trees, Ed25519 signing, projection
│   ├── jobs/                    # L2: Background task queues, worker runtime
│   ├── data-access/             # L2: Repositories, transaction helpers, DAO ports
│   ├── kernel/                  # L2: Ontological graph, universal concepts
│   ├── revelation/              # L2: Asma, 4-book corpus, moral graph, grammar, divine ontology
│   ├── temporal-engine/         # L3: Astronomical time factors, calendar synchronization
│   ├── semantic-engine/         # L3: Action-to-Mizan matrix, semantic vector resolution
│   ├── mizan-engine/            # L3: Moral balance algorithms, weight calculators, adversarial verifiers
│   ├── explanation-engine/      # L3: Decision provenance trees, audit rationale generation
│   ├── tse-engine/              # L3: Astronomical ephemeris (USNO/NOAA-Meeus), 45° hypotheses
│   ├── cosmic-engine/           # L4: Unified platform facade (analyze, query, evaluate, explain, execute)
│   ├── orchestrator/            # L4: Evidence, review, ingress, analysis workflows & audit replay
│   └── sdk/                     # L5: External consumer client SDK with retry resilience
├── src/                         # Legacy root-src (mapped for progressive migration)
├── tests/                       # Platform contracts, release suites, DDT test harness
└── docs/                        # Architecture documentation, ADRs, release notes
```

---

## 3. Tooling & Execution Environment

| Dimension | Specification | Status |
| :--- | :--- | :--- |
| **Node.js Runtime** | Node.js `v26.5.0` (win32-x64) | Active |
| **Package Manager** | npm `11.17.0` | Active |
| **TypeScript Config** | `target: ES2022`, `module: NodeNext`, `moduleResolution: NodeNext` | Enforced |
| **Zero-Any Standard** | `scripts/coding-standard.mjs` enforces 0 new `any` keywords | Enforced |
| **Architecture Boundary** | `scripts/architecture-boundary.mjs` enforces package import hierarchy | Enforced |
| **Test Engine** | Node.js Native Test Runner (`node:test`, `node:assert/strict`) | 100% Pass |

---

## 4. Current Test & Quality Baseline (Phase 0 Proof)

| Test Suite | Command | Execution Time | Results |
| :--- | :--- | :--- | :--- |
| **Typecheck** | `npm run typecheck` | ~1.8s | 0 errors |
| **Engine Typecheck** | `npm run typecheck:engine` | ~1.6s | 0 errors |
| **Architecture Boundary** | `npm run architecture:check` | ~0.4s | Passed (10 legacy imports allowed) |
| **Coding Standard** | `npm run lint` | ~0.6s | Passed (0 escape hatches) |
| **Engine Diagnostics** | `npm run test:diagnostic` | ~52ms | Passed (56.9k ops/sec Mizan, TSE valid) |
| **API Route Inventory** | `npm run test:api-route-inventory` | ~1.1s | 16/16 Passed |
| **Engine Integration** | `npm test` | ~1.2m | 47/47 Suites Passed (500 adversarial cases) |
| **Full Release Verification** | `npm run test:release` | ~2.7m | 1,007/1,007 Tests Passed |

---

## 5. Architectural Health Matrix

- **Coupling Assessment**: Packages in `packages/` have zero circular dependencies and strictly compile to their own `dist/` subdirectories.
- **Port/Adapter Separation**: Orchestrator and Engine workflows interact exclusively through explicit TypeScript interfaces (`ports`).
- **Data Boundary**: SQL queries are restricted strictly to approved adapters (`packages/persistence`, `packages/security`, `packages/witness`).
- **Theological Separation**: Mizan software engine calculates deterministic epistemic vectors without asserting metaphysical divine verdicts.
