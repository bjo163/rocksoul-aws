# Universe OS — Canonical API

## Transport & Architecture

The API uses **Node.js built-in `node:http`**. Fastify and Express are not required.
As of `v4.4.0`, the native API is fully modularized with sub-routers for `auth`, `kernel`, `entities`, and `v1` routes.
It includes built-in middleware for **CORS** and **Rate Limiting** directly atop the native `node:http` server.

## Universal endpoints

```text
POST /api/v1/observe
POST /api/v1/analyze
POST /api/v1/evaluate
POST /api/v1/query
POST /api/v1/command
GET  /api/v1/resource/:id
GET  /api/v1/resource/:id/replay
GET  /api/v1/resource/:id/audit
GET  /api/v1/revelation/core
GET  /api/v1/revelation/asma
GET  /api/v1/revelation/divine-ontology
GET  /api/v1/revelation/moral-graph
GET  /api/v1/revelation/corpora
POST /api/v1/jobs/process
GET  /api/v1/jobs/:id
POST /api/v1/ingress/reminder
POST /api/v1/ingress/reminder/trigger
```

Legacy routes may remain for compatibility, but new clients must use the Universal API.

## SDK

`packages/sdk` exposes `UniverseClient` with:

- `observe()`
- `analyze()`
- `evaluate()`
- `query()`
- `command()`
- `resource()`

## Authentication

`POST /api/v1/auth/register` and `POST /api/v1/auth/login` create and issue bearer sessions. Send `Authorization: Bearer <token>` for authenticated operations.

Roles and permissions are explicit. `ADMIN` can evaluate, command, and read audit; `REVIEWER` can evaluate and read audit; `OPERATOR` can observe, analyze, and command. Ordinary `USER` sessions do not receive privileged permissions. Actor identity is carried through the write path.

## Response model

API results use shared contracts from `packages/contracts` so the Web, Worker, API, and persistence layers do not define competing JSON shapes.

The certified E2E flow is:

```text
REGISTER / LOGIN
→ OBSERVE
→ ANALYZE
→ RESOURCE
→ REPLAY
→ AUDIT
→ IDEMPOTENT COMMAND
```

## Single-Node Witness API — v4.22 (v4.19 witness baseline retained)

The active deployment model is one local witness node.

- `GET /api/v1/witness/status` — DAG integrity plus local signing/key state (`READ_AUDIT`).
- `GET /api/v1/witness/proof/:hash` — Merkle inclusion proof (`READ_AUDIT`).
- `GET /api/v1/witness/keys` — public key lifecycle metadata only (`ADMIN`).
- `POST /api/v1/witness/keys/rotate` — create a new active key and supersede the previous active key (`ADMIN`).
- `POST /api/v1/witness/keys/revoke` — persist revocation for a supplied `keyId` (`ADMIN`).
- `POST /api/v1/witness/keys/create` — explicitly create a replacement key only when no active key exists (`ADMIN`).
- `GET /api/v1/witness/checkpoints` — list locally persisted signed checkpoints (`READ_AUDIT`).
- `POST /api/v1/witness/checkpoints` — create a signed 1-of-1 local checkpoint (`ADMIN`).

`export`, `import`, and `import/async` remain compatibility/local utility routes. Their response is labelled `local-utility`; v4.20 does not perform peer discovery or automatic network synchronization. Private keys are never returned by the API.


### Single-node operational endpoints retained in v4.20

```text
GET  /api/v1/witness/metrics
GET  /api/v1/witness/diagnostics
POST /api/v1/witness/backups
GET  /api/v1/witness/backups
GET  /api/v1/witness/backups/:backupId/verify
```

`/analyze` and `/evaluate` return a committed `witness` object containing the Q-DAG node id/hash, current root, and automatic checkpoint id when enabled. `/ai/analyze` creates the Q-DAG commitment only for callers with `ANALYZE` permission; anonymous/public analysis remains non-ledger and returns `witness.committed=false`. The witness commitment does not contain raw input text. Backup creation requires `ADMIN`; diagnostics/list/verification require `READ_AUDIT`. Restore is deliberately offline-only and has no HTTP route.

## Qur'anic Mizan response — v4.20

`/api/v1/analyze`, `/api/v1/evaluate`, and authorized `/api/v1/ai/analyze` now expose the Qur'anic analytical protocol at `quranicMizan` and/or `mizan.quranic`.

Important fields:

```text
status                       ESTABLISHED | PROVISIONAL | INSUFFICIENT_EVIDENCE | RESERVED
epistemic.evidenceState      VERIFIED | SUPPORTED_NOT_VERIFIED | UNVERIFIED_REPORT | INSUFFICIENT
epistemic.verificationRequired
quranGrounding.coverage      DIRECT | MIXED | INDIRECT | NONE
quranGrounding.refs[]
intention.state
intention.heartKnown         always false
responsibility.factor        software heuristic
responsibility.burdenTransferAllowed  always false
balance.harmSignal           separate analytical harm channel
balance.benefitSignal        separate analytical benefit channel
balance.retainBothChannels   true
balance.engineeringNetIsDivineCancellationRule false
reserved.finalDivineWeighing true
reserved.finalDestination    true
divineVerdict                false
```

Clients should use the Qur'anic status as the assertion level and treat the numeric Mizan score as secondary model telemetry. `PROVISIONAL` results must not be rendered as verified accusations.


## Pure Revelation Asma API — v4.22

```text
GET /api/v1/revelation/core
GET /api/v1/revelation/geography
GET /api/v1/revelation/asma
GET /api/v1/revelation/moral-graph
```

`/revelation/asma` exposes corpus-derived Asma surface candidates, explicit Divine relations, co-occurrence semantic fields, corpus status, and hard boundaries. Candidate output is not a canonical list of Divine Names.

`/revelation/moral-graph` exposes explicit scriptural relation edges plus their RGBL inspection lane. The RGBL lane is an engineering interpretation and is labelled as such; the exact scripture reference remains the evidence.

The former `/api/v1/revelation/divine-attributes` inspection route was removed together with the v4.21 prototype module.

## Native Revelation Binding response — v4.25

Analysis results can expose:

```text
revelationBinding.status
revelationBinding.concept
revelationBinding.references[]
revelationBinding.direction
revelationBinding.confidence
revelationBinding.languageBridge.normativeAuthority = false

revelationScorecard.direction
revelationScorecard.directionStatus
revelationScorecard.pureRevelationDerived
revelationScorecard.revelationAlignmentScore
revelationScorecard.analyticalScore
revelationScorecard.corroboration
```

`revelationAlignmentScore` measures signed direction plus software grounding/alignment confidence. It must not be displayed as "sin points", "reward points", or divine weighing. `analyticalScore` includes non-normative engineering impact magnitude and is explicitly not a pure Revelation score. `UNRESOLVED` returns null scores rather than manufacturing direction.


## Revelation-grounded scoring response — v4.26

Analysis responses may additionally expose `revelationSignals` with `rgbl`, `impactVector`, structural magnitude features, axis provenance, and supporting scripture references. `R/G/B/L` have fixed analytical roles: violation, benefit, epistemic grounding, and restoration. `B` is not counted as positive moral value.

`revelationScorecard.scoreComposition.analyticalMagnitudeSource` is `REVELATION_GROUNDED_STRUCTURAL_FEATURES_WITH_ENGINEERING_FORMULA`, while `pureAnalyticalScore` remains `false`. Clients must not label either analytical score as Divine reward/punishment, sin points, or Hisab. `UNRESOLVED` actions emit null Revelation/analytical scores and zero Revelation-grounded magnitude.

## v4.27 analysis event fields

`POST /api/v1/analyze`, `/evaluate`, and authorized `/ai/analyze` may now include `eventGraph` and `eventInterpretation` inside the analytical response/semantic observation. `eventGraph` exposes parsed nodes and sequence/context status; `eventInterpretation` exposes event-level Revelation bindings, aggregate state, lifecycle, conflicts, composite RGBL/OUT signals, and responsibility context. These fields are analytical metadata; no event parser field is a divine verdict.

## v4.28 Moral Lifecycle API

`GET /api/v1/revelation/lifecycle` returns the corpus-derived lifecycle grounding snapshot and explicit invariants. AI analysis responses also expose `moralLifecycle`, including trajectory, stage timeline, Revelation references, corroboration metadata and non-divine-judgement boundaries.

## v4.29 Revelation Grammar API

`GET /api/v1/revelation/grammar` returns the grammar snapshot: corpus/frame counts, frame kinds, sample provenance and hard invariants (`normativeAuthority=false`, `canonicalRootClaimed=false`, `externalLexiconUsed=false`). It is an inspection endpoint, not a fatwa/divine-verdict endpoint.


### `/api/v1/revelation/divine-ontology`

Returns the v4.30 corpus-derived Divine Ontology: scripture-attested surface concepts, strict context clusters, explicit relation families, relation-target concepts, counts, invariants and exact Revelation provenance. `canonicalDivineNamePromotedAutomatically=false` and clustering has zero normative authority.
