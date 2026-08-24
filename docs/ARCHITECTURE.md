# Universe OS — Canonical Architecture

## 1. Purpose

Universe OS is a universal event/state/knowledge platform. Its core unit is not a domain such as hospital, police, finance, or religion; it is a persistent **case/event/state graph** that can be observed, analyzed, evaluated, governed, replayed, and audited.

## 2. Runtime layers

```text
CLIENTS
  ├─ Web / Observatory
  ├─ Admin
  ├─ SDK / external clients
  └─ Worker
        ↓
UNIVERSAL API (native Node HTTP)
        ↓
APPLICATION SERVICES
        ↓
KERNEL
  ├─ Entity
  ├─ Event
  ├─ State
  ├─ Relation
  ├─ Identity
  └─ Context
        ↓
ANALYSIS ENGINES
  ├─ Semantic / Domain
  ├─ RGBL
  ├─ Action Gates
  ├─ Impact
  ├─ TimeFactor
  ├─ Causality
  ├─ Evidence / Knowledge
  └─ Mizan
        ↓
CASE LIFECYCLE
        ↓
PERSISTENCE / EVENT LEDGER / AUDIT
  ├─ PostgreSQL operational projection/query layer
  ├─ File persistence for standalone/local runtime
  ├─ Memory persistence for ephemeral tests/development
  ├─ Witness/Q-DAG content-addressed causal history
  ├─ Ed25519 signed checkpoints + witness bundles
  ├─ offline branch reconciliation / explicit causal merge
  └─ System Traces (Volatile Observability)
```

## 3. Application boundaries

```text
apps/
├─ api/            Shared Universal HTTP entrypoint
├─ web/            Unauthenticated public home and system boundaries
├─ xrp/            Authenticated public-user RID portal
├─ cab/            Private governance/operator console
└─ flow/           Governed workflow editor and execution history
```

The active repository contains `api`, `web`, `xrp`, `cab`, and `flow`. XRP and Flow have independent packages, builds, tests, ports, and local launcher entries while sharing the governed UI and API/session boundaries. Background work is handled by the worker/job subsystem in the backend packages rather than requiring a separate HTTP app.

The production boundary is the Universal API: it coordinates actor context, persistence, idempotency, observability, and the semantic engines. Web, XRP, CAB, Flow, and the SDK consume that boundary rather than creating parallel write paths. Public web/XRP and private CAB deployments must remain separable; the public bundles must not contain CAB credentials, internal routes, or operational configuration.

## 4. Package boundaries

```text
packages/
├─ contracts/      shared schemas/contracts
├─ data-access/    repository/data-mapper client
├─ persistence/    persistence drivers + migrations/seed
├─ sdk/            Universal API client
└─ ui/             shared Civic Command tokens, primitives, shells, and states
```

### 4.1 Data-access and SQL boundary

Business actions use `UniverseStore`, `PersistenceClient`, and typed repositories. API routes, CAB, XRP, Flow, and domain/analysis engines do not issue SQL. This is an internal repository/data-mapper architecture (ORM-like), not a dependency on Prisma, TypeORM, or another generated ORM.

SQL is permitted only inside the approved PostgreSQL persistence, authentication, idempotency, and Witness projection adapters. Runtime values use driver placeholders (`$1` and parameter arrays); SQL string interpolation is prohibited. Versioned schema DDL belongs in `packages/persistence/src/schema.ts`; runtime providers may only bootstrap the migration registry before applying those migrations.

`npm run test:persistence-boundary` statically inventories every source file containing SQL and fails if SQL escapes an approved adapter, runtime DDL returns, or a statement interpolates runtime values. This preserves database portability without leaking storage concerns into governed business behavior.

## 4.2 Canonical human-interface system

All human-facing applications use one **MoonWitness Civic Command System**. It is a restrained civic sci-fi enterprise language designed for public, government, and internal operational use. Retro/pixel/game presentation is explicitly excluded from the canonical system.

Consistency is enforced through `@moonwitness/ui`: shared semantic tokens, typography, iconography, Solar/Light and Lunar/Dark modes, Indonesian/English localization behavior, accessibility, identity presentation, interaction states, and reusable operational visualizations. Applications may use different workspace compositions because their responsibilities differ, but they may not invent separate brands, authorization cues, evidence semantics, or review/audit status language.

RID is the only canonical human identity label. Permissions derive from explicit role, purpose, scope, and clearance. A score, achievement, reputation, spiritual claim, or alternate identity may not grant authority. World-state screens describe bounded simulations and must surface `SIMULATION · NOT REALITY` and `HUMAN AUTHORITY · LIMITED`.

## 5. Core source areas

```text
src/
├─ kernel/         universal primitives
├─ case/           case aggregate
├─ ai/             semantic analysis + memory/providers
├─ engines/        domain-independent analytical engines
├─ ingress/        revelation/reminder pattern ingestion
├─ knowledge/      source/evidence/knowledge handling
├─ persistence/    runtime persistence services
├─ jobs/           asynchronous job processing
├─ observability/  request/case/system traces
├─ audit/          application audit and replay
├─ ledger/         Witness/Q-DAG + distributed cryptographic witness layer
├─ security/       authentication/authorization
├─ identity/       actor/system identity model
├─ governance/     policy/CAB/change controls
└─ domains/        domain adapters only
```

## 6. Canonical case flow

```text
OBSERVATION
  ↓
SEMANTIC / DOMAIN
  ↓
RGBL (R → G → B → L)
  ↓
9 ACTION GATES
  ↓
ACTION / EVENT
  ↓
13 IMPACT
  ↓
TIMEFACTOR
  ↓
CAUSALITY
  ↓
EVIDENCE / PROVENANCE
  ↓
MIZAN
  ↓
CASE LIFECYCLE
  ↓
STATE CHANGE
  ↓
EVENT LEDGER / AUDIT
  ↺
```

PostgreSQL is the operational persistence/projection target for the current production architecture. File persistence is the portable standalone/local mode, while memory persistence is reserved for ephemeral test/development scenarios. The Witness/Q-DAG layer is deliberately storage-independent. **v4.26 operational mode remains single-node**; it retains the v4.19 witness baseline. The canonical witness ledger is the atomically persisted local `witness/qdag.json`; one encrypted local Ed25519 identity signs 1-of-1 checkpoints. PostgreSQL mirrors public Q-DAG/key/checkpoint projections and is only a recovery source when the local Q-DAG is missing. Analyze/evaluate paths write hash-only Mizan commitments into Q-DAG. Peer discovery, federation, gossip, network quorum, and consensus are not active runtime architecture.

## 7. Case lifecycle model

The runtime models a single continuous case record across lifecycle states:

`DUNYA → DYING → DECEASED → BARZAKH → RESURRECTION → MAHSHAR → HISAB → MIZAN → FINAL_STATE`

The terminal state is a **modelled application state**. The software does not claim to know or issue a divine verdict.

## 8. Knowledge and revelation pattern model

The knowledge layer separates:

1. Qur'an text/metadata and explicit Qur'anic statements.
2. Revelation chronology metadata.
3. Qur'anic narrative patterns.
4. Historical Asbāb al-Nuzūl / report context with provenance.
5. Research datasets and machine-derived hypotheses.

These layers must not be silently merged into one undifferentiated truth source.

## 9. Backend Maturity State (Finalized)
- **Job Queue Automation:** `PersistentJobQueue` features a robust background worker daemon that self-polls for pending jobs, resilient to concurrency issues using PostgreSQL `FOR UPDATE SKIP LOCKED`.
- **Session Security:** Fully stateless JWT implementation via `node:crypto` HMAC-SHA256. Zero external dependencies, with an in-memory active session map to broadcast `onlineUsers`.
- **Real-time Telemetry:** A native Server-Sent Events (SSE) endpoint (`/api/v1/stream`) pushes trace logs and user presence dynamically.
- **Guarded Kernel:** All write endpoints are gated by a lightweight, zero-dependency `Validator` schema utility to prevent malformed data pollution.
- **Pagination Standard:** All list and search endpoints inherently support defensive `limit` and `offset` guards.

## 10. Current TODOs / Next Steps

- Prove single-node restart/recovery behavior against the target deployment filesystem and PostgreSQL service.
- Add operator-facing Observatory UI for witness health, active key state, checkpoint history, and Q-DAG verification.
- Decide later—based on actual operational requirements—whether a second node or external custody provider is needed.
- Do not introduce peer discovery, gossip, or consensus until that decision is made.

## Single-node witness data flow — v4.19 baseline retained in v4.20

```text
API / Worker Mizan result
        |
        v
MW-MIZAN-WITNESS-V1 hash commitment
        |
        v
Canonical local Q-DAG (witness/qdag.json)
        |\
        | \-- signed 1-of-1 checkpoint -> checkpoints.json
        \---- optional PostgreSQL public projection

Backup -> manifest + Q-DAG snapshot + encrypted keystore + checkpoints
Diagnostics -> integrity + signing + checkpoint + backup health
```

## v4.20 Qur'anic epistemic Mizan layer

v4.20 inserts an epistemic protocol before the numeric Mizan is treated as an assertion:

```text
REPORT
  → VERIFY / EVIDENCE STATE
  → KNOWLEDGE BOUNDARY
  → BIAS-RESISTANT QIST
  → ACTION + INTENTION SIGNAL
  → CAPACITY / COERCION / INDIVIDUAL RESPONSIBILITY
  → IMPACT + CAUSALITY
  → QUR'ANIC MIZAN STATUS
  → SECONDARY NUMERIC MODEL
  → Q-DAG COMMITMENT
```

Primary assertion states are `ESTABLISHED`, `PROVISIONAL`, `INSUFFICIENT_EVIDENCE`, and `RESERVED`. See `QURANIC_MIZAN.md`. The witness layer is unchanged: this remains a single-node architecture.


### v4.20 balance invariant

The primary Qur'anic analytical layer preserves harm and benefit as separate channels. Causality, recurrence/intensity, or domain breadth may amplify a detected harmful/beneficial signal but may not manufacture harm by themselves. Epistemic uncertainty is carried separately from accountability. Legacy net/XP fields are compatibility telemetry only and are not treated as a revealed cancellation rule.


## v4.21 Four-book Revelation Core

Normative reasoning is restricted to Al-Qur'an, Tawrat, Zabur, and Injil, with Al-Qur'an primary/Muhaimin. External research and historical metadata cannot contribute normative weight. The engine distinguishes scripture text from metadata and distinguishes a place mentioned in a passage from the place where that passage was revealed. Tawrat/Zabur/Injil transmitted textual-witness corpora are now bundled and seeded for corroboration only; they are not equated with the original revealed texts and cannot establish or reverse primary moral direction. See `REVELATION_SEMANTIC_CORE.md`.

## v4.22 Pure Revelation Asma / Moral Graph

The canonical Revelation branch is now separated from general analytical engines:

```text
src/revelation/
  corpus/source policy
        ↓
  asma/
    candidate miner
    explicit relation miner
    corpus co-occurrence fields
        ↓
  moral-graph/
        ↓
  event/semantic bridge
        ↓
  RGBL → 13 OUT → Mizan
```

`src/engines/asma.ts` no longer exists. The old 99-name catalog and semantic-profile datasets are removed. The action registry may help parse language, but it no longer provides Asma IDs and has no normative authority. Asma discovery is upstream of scoring: Asma Engine discovers Divine-reference structure; Mizan remains a separate analytical/scoring layer.

## v4.23 Revelation scoring/corroboration layer

```text
QURAN (primary / Muhaimin)
        ↓
Revelation Moral Graph + Quran passage directive verification
        ↓
Action/passage binding
        ↓
Revelation analytical direction
        ↓
RGBL / 13 OUT / Mizan magnitude
        ↓
Revelation scorecard

TAWRAT ─┐
ZABUR  ─┼─ textual-witness corroboration → confidence only (max combined +0.30)
INJIL  ─┘
```

The three witness corpora never vote against or overrule the Quran. Their equal weights are engineering confidence weights, not revealed units. The action-language bridge remains non-normative and is explicitly surfaced when it participates in action-to-passage binding.

## v4.24 Revelation installation/data plane

```text
revelation-corpus-manifest.json
        │ count + SHA-256
        ▼
seed manifest ──► typed passage entities
        │
        ▼
Persistence (PostgreSQL in production; File for standalone/local operation)
        │
        ├──► runtimeDataset arrays
        │        └──► FourBookCorpus / corroboration
        │
        └──► derived indexes
                 ├── corpus fingerprint snapshot
                 ├── Pure Revelation Asma snapshot
                 └── Revelation Moral Graph snapshot
```

The derived indexes are reproducible outputs and never replace passage provenance. Qur'an remains the primary/Muhaimin direction source; witness indexes only corroborate.

## v4.25 Native Revelation Binding layer

```text
USER TEXT
   ↓
Language Adapter (non-normative)
   ↓ query surfaces only
Native Revelation Binder
   ↓ runtime scan/retrieval
Qur'an primary passage evidence
   ↓
Revelation Moral Graph / passage-direction analysis
   ↓
Four-book corroboration (confidence only)
   ↓
RGBL / Mizan / derived scores
   ↓
Q-DAG provenance
```

The language adapter cannot contain verse references or moral direction. Tawrat/Zabur/Injil cannot create/reverse direction. This keeps the normative boundary above the engineering NLP and below the downstream scoring layer.

## v4.26 Revelation-grounded RGBL / OUT scoring

The canonical analysis path no longer obtains core RGBL magnitude or the 13 OUT vector from action-specific `action-semantics` scores. Native Revelation Binding first establishes a conditional direction from retrieved Qur'an passage structure. `src/revelation/scoring/revelation-magnitude.ts` then derives analytical strength from scripture-grounded structural features: directive/consequence evidence, explicit Moral-Graph relations, repetition/coverage, and binding confidence.

```text
NATIVE REVELATION BINDING
        ↓
RETRIEVED QUR'AN PASSAGES
        ↓
STRUCTURAL MAGNITUDE FEATURES
        ↓
R / G / B / L
        ↓
LOCAL 13-OUT RELEVANCE
        ↓
MIZAN ANALYTICAL SCORE
```

`R` is violation, `G` constructive benefit, `B` epistemic grounding, and `L` restoration. `B` never creates moral benefit. OUT axes remain an engineering analytical topology rather than a claimed revealed 13-item taxonomy. Formula parameters live in `data/revelation/scoring-profile.json` with `normativeAuthority=false` and are pinned by `REVELATION-INDEX::SCORING`. Numerical output is therefore reproducible and Revelation-grounded in its inputs, but is not a revealed sin/reward unit or Divine verdict.

## v4.27 Event-first analysis path

```text
USER TEXT
  ↓
LANGUAGE / SEMANTIC EVENT INTERPRETER (non-normative)
  ↓
EVENT GRAPH
  ├─ occurred / reported / negated / context-invalidated
  ├─ actor / patient / object / ownership clues
  ├─ knowledge / mistake / coercion / permission
  └─ sequence / restoration / conflict candidates
  ↓
EVENT-BY-EVENT NATIVE REVELATION BINDING
  ↓
FOUR-BOOK CORROBORATION (confidence only)
  ↓
RGBL + 13 OUT + MIZAN
  ↓
Q-DAG HASH COMMITMENT
```

This ordering prevents a strong moral engine from confidently judging a sentence that it parsed incorrectly. Event parsing cannot create moral direction. Opposing event/principle relations are exposed as conflicts rather than hidden by score arithmetic.

## v4.28 Moral Lifecycle layer

`src/events/moral-lifecycle.ts` consumes the event graph and event-level Revelation bindings, then records awareness, regret, cessation, declared return/repentance, restitution, repair, human reconciliation, persistence and relapse as a temporal trajectory. It does not erase prior violation nodes. `src/revelation/lifecycle/` discovers related Quran passages at runtime from corpus-search surfaces and uses Tawrat/Zabur/Injil only as equal confidence-only corroboration. The lifecycle language and query profiles are non-normative.

## v4.29 Revelation Grammar & Relation layer

`Qur'an corpus → structural grammar frames → Asma explicit relations / passage direction → Moral Graph → native binding → RGBL/Mizan`. Grammar is non-normative. Negation, coordinated predicates, vocative, speech and condition/cause candidates keep ayah provenance. Tawrat/Zabur/Injil remain corroboration channels and do not override Qur'an grammar.

## v4.30 Divine Ontology layer

Revelation Grammar now feeds `src/revelation/asma/divine-ontology.ts` before the Moral Graph. The ontology groups exact scripture surface concepts, strict corpus-context clusters, polarity-preserving relation families and explicit relation-target concepts. Explicit ayah relations remain primary evidence; an ontology cluster cannot manufacture moral authority. The downstream order is `Grammar → Asma/Divine Ontology → Moral Graph → Event Interpreter → RGBL/13 OUT → Mizan`.
