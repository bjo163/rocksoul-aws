# Cosmic / MoonWitness OS — v5 Package Boundary Strategy

## Purpose

Define which parts of the platform are stable enough to extract/freeze as reusable packages and which parts must remain implementation-owned and evolving.

This document is a **design boundary**, not an instruction to perform a large refactor during 4.33.0 certification.

## Stable package candidates

### 1. `@moonwitness/contracts`
Status: **FREEZE CANDIDATE**

Owns wire-level request/response and shared domain contracts:
- EvidenceRecord / Evidence status
- ReviewRecord / review enums
- HumanReviewGate
- WitnessReference
- AuthSession / public user contracts
- XRP workspace contracts
- Flow workflow contracts
- API error envelope

Rules:
- backward-compatible additions preferred;
- no silent semantic changes;
- breaking changes require a major protocol/contract version;
- runtime validators stay deterministic.

### 2. `@moonwitness/ui`
Status: **STABLE API / EVOLVING IMPLEMENTATION**

Owns shared Civic Command design tokens, primitives, shells, accessibility, localization, theme, and operational visual semantics.

Rules:
- applications may compose different workspaces;
- applications may not invent competing authority/review/evidence semantics;
- visual implementation can evolve without changing semantic state contracts.

### 3. `@moonwitness/sdk`
Status: **STABLE API / EVOLVING IMPLEMENTATION**

Owns the client boundary for Universal API consumers.

The SDK depends on contracts, not application internals. API methods may be internally refactored while keeping compatibility with the supported API version.

### 4. Persistence contract
Status: **STABLE CONTRACT / EVOLVING ADAPTERS**

The stable surface is the persistence repository/store interface and its invariants. PostgreSQL, File, and Memory implementations remain replaceable adapters.

Do not freeze SQL layout or provider internals as package API.

## Next package candidates

### 5. `@moonwitness/protocol`
Status: **EXTRACT AFTER 4.33.0**

Owns versioned protocol identifiers, wire-format helpers, compatibility metadata, and protocol-version constants.

Examples already present in the platform include:
- `HUMAN_REVIEW_GATE_V1`
- `MW_XRP_WORKSPACE_V1`
- `MW_AUTH_SESSION_V1`
- `MW-MIZAN-WITNESS-V1`

It must contain protocol mechanics, not business logic.

### 6. `@moonwitness/evidence`
Status: **EXTRACT CANDIDATE**

Owns generic evidence semantics:
- EvidenceRecord
- source/status taxonomy
- confidence normalization
- provenance references
- fingerprinting
- supersession/history
- conflict handling

It must not own Revelation-specific normative logic.

### 7. `@moonwitness/review`
Status: **EXTRACT CANDIDATE**

Owns the generic human-review state machine and review transitions.

It may depend on contracts/protocols, but it must not depend on CAB, Flow, Revelation, or UI application code.

## Keep internal / evolving

Do not extract these as stable public packages yet:
- `src/kernel` — core execution primitives are heavily depended upon and still need a clean dependency graph before public freezing.
- `src/engines` — analytical formulas and semantic behavior remain intentionally evolvable.
- `src/ai` — provider/evaluation/fallback behavior is still a platform workstream.
- `src/governance` implementation — stable governance contracts already belong in shared contracts; implementation remains application/platform owned.
- Revelation internals — the package boundary exists, but semantic internals remain evolving.
- Witness internals — API/boundary can stabilize before storage/rotation/operational implementation is fully frozen.
- Worker internals — queue protocol can stabilize separately from worker implementation.
- Domain adapters — remain domain-specific and must not leak into the universal platform contracts.

## Dependency direction

```text
contracts
   ↑
protocol ───────┐
evidence ──────┤
review ────────┤
               ↓
              sdk
               ↓
        Universal API boundary
               ↓
   persistence / revelation / witness
               ↓
      engines / AI / domains
```

UI remains a consumer-facing package:

```text
contracts → ui → Web / XRP / CAB / Flow
```

No stable package may import application-specific code.

## Extraction gates

A package may move from candidate to stable only when:

1. its public API has explicit ownership;
2. dependency direction is one-way and verified;
3. consumers can use it without importing `apps/*` or `src/*` implementation internals;
4. compatibility tests exist;
5. versioning/deprecation policy exists;
6. release certification runs against the exact package graph;
7. there is a meaningful reason for reuse or independent evolution.

## v5 target

The intended stable platform surface is intentionally small:

```text
@moonwitness/contracts
@moonwitness/protocol
@moonwitness/evidence
@moonwitness/review
@moonwitness/ui
@moonwitness/sdk
@moonwitness/persistence   (contract stable; adapters evolving)
```

The v5 objective is **stable boundaries**, not maximum package count.

Large structural extraction should occur only after the 4.33.0 release gate is green so package refactors do not obscure or invalidate the current certification evidence.
