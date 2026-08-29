# Cosmic Architecture — Package Ownership Map (Phase 1 & 2)

## 1. Overview

This document defines the strict package ownership and functional classification for every capability, engine, domain profile, workflow, and port across the Cosmic platform.

---

## 2. Package Ownership Classification Matrix

| Package Name | Layer | Category | Core Responsibilities | Public Entrypoints |
| :--- | :--- | :--- | :--- | :--- |
| **`@moonwitness/contracts`** | L0 | Contract | Canonical DTOs, schemas, epistemic types, review gate assertions | `dist/index.js` |
| **`@moonwitness/persistence`** | L1 | Adapter / Port | Universal entity/relation/event stores, Postgres, File, Memory, YAML config loader | `dist/index.js` |
| **`@moonwitness/observability`** | L1 | Tooling / Port | Distributed tracing, correlation IDs, Prometheus metrics, secret redaction | `dist/index.js` |
| **`@moonwitness/security`** | L1 | Port / Adapter | Auth service, RBAC matrix, token signer, Postgres auth driver, memory rate limiter | `dist/index.js` |
| **`@moonwitness/domains`** | L2 | Domain Engine | 10 state & society analytical domains (Defense, Energy, Economy, Digital Trust, etc.) | `dist/index.js` |
| **`@moonwitness/witness`** | L2 | Domain Engine | QDAG ledger, distributed Merkle tree, Ed25519 signing, projection store | `dist/index.js` |
| **`@moonwitness/jobs`** | L2 | Infrastructure | Background task queue, in-memory/durable queue ports, worker execution lifecycle | `dist/index.js` |
| **`@moonwitness/data-access`** | L2 | Data Port | High-level data repositories, DAO abstractions, transactional unit of work | `dist/index.js` |
| **`@moonwitness/kernel`** | L2 | Core Domain | Universal knowledge ontology, conceptual graph, semantic entity grounding | `dist/index.js` |
| **`@moonwitness/revelation`** | L2 | Core Domain | Asma engine, 4-book scripture corpus, moral graph, grammar engine, divine ontology | `dist/index.js` |
| **`@moonwitness/temporal-engine`** | L3 | Capability Engine | Astronomical time factors, solar/lunar calendar models, temporal reasoning | `dist/index.js` |
| **`@moonwitness/semantic-engine`** | L3 | Capability Engine | Natural language semantic parsing, action-to-Mizan matrix, offline registry provider | `dist/index.js` |
| **`@moonwitness/mizan-engine`** | L3 | Capability Engine | Deterministic moral balance, RGBL vector weights, adversarial safety rules | `dist/index.js` |
| **`@moonwitness/explanation-engine`** | L3 | Capability Engine | Decision provenance trees, audit rationale generator, transparency traces | `dist/index.js` |
| **`@moonwitness/tse-engine`** | L3 | Capability Engine | Astronomical ephemeris (USNO, NOAA-Meeus), 45° hypotheses, gold calibrations | `dist/index.js` |
| **`@moonwitness/cosmic-engine`** | L4 | Facade | Unified platform engine facade (`analyze`, `query`, `evaluate`, `explain`, `execute`) | `dist/index.js` |
| **`@moonwitness/orchestrator`** | L4 | Workflow | Host-neutral workflows (Evidence, Review, Ingress, Analysis, Audit Replay) | `dist/index.js` |
| **`@moonwitness/sdk`** | L5 | Client SDK | Consumer TypeScript SDK, HTTP transport, retry resilience, contract typing | `dist/index.js` |
| **`apps/api`** | L5 | Application Host | REST API server, Fastify staging runtime, route adapters, middleware | `dist/index.js` |

---

## 3. Legacy Directory to Target Package Mapping

Every directory in root `src/` maps to a canonical package:

| Legacy `src/` Directory | Target Package Owner | Migration Status |
| :--- | :--- | :--- |
| `src/access/` | `@moonwitness/security` | 100% Packageized |
| `src/ai/` (General Analyzer, Providers) | `@moonwitness/cosmic-engine` & `@moonwitness/semantic-engine` | Active Facade Migration |
| `src/audit/`, `src/replay/` | `@moonwitness/orchestrator/audit` | 100% Packageized |
| `src/contracts/` | `@moonwitness/contracts` | 100% Packageized |
| `src/domains/` (10 Domain profiles) | `@moonwitness/domains` | 100% Packageized |
| `src/durability/`, `src/persistence/` | `@moonwitness/persistence` | 100% Packageized |
| `src/events/`, `src/lifecycle/` | `@moonwitness/revelation` & `@moonwitness/orchestrator` | 100% Packageized |
| `src/jobs/` | `@moonwitness/jobs` | 100% Packageized |
| `src/kernel/`, `src/knowledge/` | `@moonwitness/kernel` | 100% Packageized |
| `src/ledger/` | `@moonwitness/witness` | 100% Packageized |
| `src/observability/` | `@moonwitness/observability` | 100% Packageized |
| `src/revelation/` (Asma, Corpus, Grammar) | `@moonwitness/revelation` | 100% Packageized |
| `src/review/` | `@moonwitness/orchestrator` & `@moonwitness/contracts` | 100% Packageized |
| `src/security/` | `@moonwitness/security` | 100% Packageized |
| `src/semantic/` | `@moonwitness/semantic-engine` | 100% Packageized |
| `src/engines/` (Mizan, TSE, Temporal) | `@moonwitness/mizan-engine`, `@moonwitness/tse-engine`, `@moonwitness/temporal-engine` | 100% Packageized |
