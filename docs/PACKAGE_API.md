# Package API Reference

This document freezes the public API surface for all `@moonwitness/*` engine
packages. It is derived from the actual `src/index.ts` files in the monorepo
and is intended as the single source of truth for consumers and the
compatibility policy.

## Packages

| Package | Role | Framework-agnostic | Host-dependent |
| --- | --- | --- | --- |
| `@moonwitness/contracts` | Shared DTOs, protocol versions, validation, and assertion helpers | Yes | No |
| `@moonwitness/temporal-engine` | Host-neutral temporal primitives for normalized time events and comparisons | Yes | No |
| `@moonwitness/tse-engine` | Provider-neutral temporal significance engine for deterministic astronomical facts and research scoring | Yes | No |
| `@moonwitness/semantic-engine` | Host-neutral semantic signal vectors and definition registry primitives | Yes | No |
| `@moonwitness/mizan-engine` | Host-neutral deterministic Mizan scoring and Quranic Mizan analytical primitives | Yes | No |
| `@moonwitness/explanation-engine` | Host-neutral analytical explanation primitives for Cosmic results | Yes | No |
| `@moonwitness/witness` | Host-neutral immutable Witness DAG, Mizan commitments, checkpoints, transport, and recovery primitives | Yes | No |
| `@moonwitness/persistence` | Storage and projection adapters (file, Postgres, memory) | Yes | No (requires `pg` peer dep for Postgres) |
| `@moonwitness/data-access` | Facade over persistence with entity/relation/event/evidence/audit convenience methods | Yes | No |
| `@moonwitness/kernel` | Canonical kernel/domain boundary for Entity, Event, State, Relation and governed runtime primitives | Yes | No |
| `@moonwitness/jobs` | Persistence-backed job queue with explicit handler registration and polling lifecycle | Yes | No (requires `pg` peer dep for Postgres) |
| `@moonwitness/orchestrator` | Host-neutral workflows that coordinate engines through injected persistence, witness, review, and job ports | Yes | No |
| `@moonwitness/cosmic-engine` | Host-neutral Cosmic facade for temporal facts, candidate semantic observations, Mizan context, and explanations | Yes | No |
| `@moonwitness/sdk` | Consumer-facing HTTP client for the Universe API | No (uses `fetch`) | Yes (talks to `apps/api`) |
| `@moonwitness/revelation` | Canonical corpus and knowledge boundary | Yes | No |

## `@moonwitness/contracts`

Entry point: `src/index.ts`

### Types

- `JsonValue` — recursive JSON value union
- `JsonObject` — `Record<string, JsonValue>`
- `EvidenceStatus` — `'OBSERVED' | 'SUPPORTED' | 'VERIFIED' | 'CORROBORATED' | 'INFERRED' | 'UNKNOWN' | 'CONFLICTED'`
- `ReviewDecision` — `'ALLOW_ANALYTICAL_DISPLAY' | 'REQUIRE_HUMAN_REVIEW' | 'BLOCK_ADVERSE_ACTION'`
- `ReviewStatus` — `'QUEUED' | 'ASSIGNED' | 'ACKNOWLEDGED' | 'EVIDENCE_REQUESTED' | 'DISPOSED' | 'ESCALATED' | 'REOPENED'`
- `HumanDisposition` — `'UPHOLD_GATE' | 'ALLOW_ANALYTICAL_DISPLAY' | 'REQUEST_MORE_EVIDENCE' | 'ESCALATE'`
- `UniverseObservationRequest`
- `UniverseAnalysisRequest`
- `UniverseEvaluationRequest`
- `UniverseCommandRequest`
- `UniverseQueryRequest`
- `EvidenceAttachmentRequest`
- `EvidenceRecord`
- `HumanReviewReason`
- `HumanReviewGate`
- `WitnessReference`
- `ReviewRecord`
- `ReviewCreateRequest`
- `ReviewTransitionRequest`
- `UniverseRecord`
- `AnalysisResultContract`
- `UniverseEvaluationResponse`
- `UniverseObservationResponse`
- `UniverseQueryResponse`
- `UniverseQueryListResponse`
- `EvidenceAttachmentResponse`
- `EvidenceListResponse`
- `XrpEvidenceSummary`
- `XrpReviewSummary`
- `XrpWitnessSummary`
- `XrpCaseSummary`
- `XrpWorkItemSummary`
- `XrpWorkspaceResponse`
- `XrpCreateResponse`
- `XrpEvidenceCreateResponse`
- `XrpWorkItemCreateResponse`
- `FlowNodeContract`
- `FlowWorkflowContract`
- `FlowListResponse`
- `FlowReviewResponse`
- `PublicUserContract`
- `AuthSessionContract`
- `AuthLoginRequest`
- `AuthRefreshRequest`
- `AuthLogoutResponse`
- `ApiErrorBody`

### Classes

- `ContractValidationError` — thrown when a payload fails a contract assertion.

### Functions

- `isHumanReviewGate(value)` — type guard for `HumanReviewGate`
- `assertHumanReviewGate(value)` — runtime assertion for `HumanReviewGate`
- `isWitnessReference(value)` — type guard for `WitnessReference`
- `assertPublicUser(value)` — runtime assertion for `PublicUserContract`
- `assertAuthSession(value)` — runtime assertion for `AuthSessionContract`
- `assertAnalysisResult(value, expectedKind?)` — runtime assertion for analysis/evaluation responses
- `assertReviewRecord(value)` — runtime assertion for `ReviewRecord`
- `assertXrpWorkspace(value)` — runtime assertion for `XrpWorkspaceResponse`
- `assertApiResponseContract(method, path, value)` — validates API response bodies against known routes

### Error contracts

- `ContractValidationError` carries `contract` (the failing contract name) and `issues` (array of human-readable problem strings).
- All `assert*` functions throw `ContractValidationError` on invalid input.

## `@moonwitness/temporal-engine`

Entry point: `src/index.ts`

### Types

- `TemporalScope` — `'INSTANT' | 'INTERVAL' | string`
- `TimeEvent` — `{ occurredAt, calendar, eraId, duration, temporalScope }`
- `MakeTimeEventInput` — partial `TimeEvent`

### Functions

- `now()` — returns current UTC timestamp in ISO format
- `makeTimeEvent(input?)` — creates a host-neutral temporal event
- `compareTime(a, b)` — millisecond difference between two temporal values

### Determinism

All functions are deterministic. `now()` is the only source of non-determinism
because it reads wall-clock time; all other functions are pure given the same
inputs.

## `@moonwitness/tse-engine`

Entry point: `src/index.ts`

### Types

- `TSELocation` — `{ name?, region?, country?, latitude, longitude, elevationMeters?, timezone }`
- `TSEInput` — input contract for `calculateTemporalState`
- `TSEEventState` — `{ status: 'RESOLVED' | 'UNRESOLVED', utc, reason? }`
- `TSETemporalState` — full temporal significance result including solar, lunar, night, markers, scoring, and provenance

Re-exported types from submodules:
- `EphemerisProvider`, `HorizonRefraction` (from `ephemeris-provider`)
- Hypothesis registry types (from `hypothesis-registry`)
- `TemporalScoring` (from `temporal-scoring`)

### Functions

- `calculateTemporalState(input)` — computes solar, lunar, night, and scoring state for a given timestamp and location
- `toMizanTemporalContext(state)` — converts `TSETemporalState` into Mizan-compatible temporal context
- `phaseName(angle)` — maps lunar phase angle to human-readable phase name

### Input/Output contracts

**Input (`TSEInput`)**
- `timestamp` — ISO string or Date; validated for parseability
- `location` — required object with `latitude` (-90..90), `longitude` (-180..180), and `timezone` (valid IANA string)
- `activity` — optional activity metadata
- `nightModel` — `'SUNSET_TO_SUNRISE' | 'SUNSET_TO_FAJR'`
- `nightBoundary` — required when `nightModel` is `'SUNSET_TO_FAJR'`
- `provider` — optional `EphemerisProvider`; defaults to `astronomyEngineProvider`
- `calculation` — optional `{ horizonRefraction, riseSetSearchDays }`

**Output (`TSETemporalState`)**
- `protocol` — always `'TEMPORAL_SIGNIFICANCE_ENGINE_V1'`
- `scoring` — `{ rawScore, confidence, confidenceAdjustedScore, classification, hypothesisSignalScore, astronomicalDataStatus, dataQuality, activityIndependent }`
- `provenance` — includes `scoreIsNotDivineReward: true`

### Determinism guarantees

TSE scoring is deterministic given the same inputs. The only non-deterministic
inputs are:
- The `EphemerisProvider` implementation (the default `astronomyEngineProvider` is deterministic).
- Wall-clock time via `now()` when used externally.

`confidenceAdjustedScore` is rounded to 4 decimal places. `dataQuality` is
rounded to 6 decimal places. Hypothesis signals are reported independently and
must never alter the base temporal score.

## `@moonwitness/semantic-engine`

Entry point: `src/index.ts`

### Types

- `SemanticKey` — `string | number`
- `SemanticMode` — `'REFLECTION' | 'DEVIATION' | string`
- `BuildSemanticVectorInput` — `{ primary?, secondary?, relevance?, mode? }`
- `SemanticVectorAttribute` — `{ id, primary, weight, scaleBias, source }`
- `AnalyticalSemanticVector` — `{ primary, secondary, weights, attributes, mode, semanticReady, normativeAuthority }`
- `SemanticDefinition` — `{ id, label, evidence_refs?, source_note?, version?, [key: string]: unknown }`
- `SemanticRegistrySnapshot` — `{ version, definitions, loadedAt }`

### Functions

- `buildAnalyticalSemanticVector(input?)` — builds a deterministic, non-normative semantic signal vector
- `SemanticRegistry.fromFile(filePath)` — loads definitions from a JSON file

### Classes

- `SemanticRegistry` — in-memory semantic definition registry

### Determinism guarantees

`buildAnalyticalSemanticVector` is deterministic given the same inputs. Weights
are clamped to `[0, 1]` and rounded to 6 decimal places. `normativeAuthority` is
always `false`.

## `@moonwitness/mizan-engine`

Entry point: `src/index.ts`

### Types

- `Loose` — `Record<string, any>`
- `MizanDatasetLoader` — `(path: string, fallback: unknown) => unknown`

### Functions

- `configureMizanDatasetLoader(loader?)` — sets a custom dataset loader for JSON data files
- `severityBand(raw)` — maps raw score to severity band (70, 30, 12, 4)
- `normalizeScale(scale?)` — normalizes a Mizan scale object to numeric values
- `calculateScaleFactor(scale?)` — computes the scale factor from normalized scale
- `calculateSemanticScaleAffinity(vector?)` — computes affinity between semantic vector and scale
- `calculateEssenceFactor(vector?)` — computes essence factor from semantic vector weights
- `calculateXp({ baseXp, semanticVector, scale, factors, mode })` — computes XP breakdown (positive, deviation, repair)
- `evaluateMizan({ semantic, semanticVector, factors, scale, actionGateVector, impactVector, timeFactor, causality, domainVector, semanticObservation, evidenceCount, confidence, evidenceQuality })` — core Mizan evaluation
- `evaluateQuranicMizan({ text, observed, mizan, conflicts, eventInterpretation })` — Quranic grounding analytical boundary

### Determinism guarantees

`evaluateMizan` and `evaluateQuranicMizan` are deterministic given the same
inputs. All intermediate numeric values are clamped to `[0, 1]` and rounded to
6 decimal places where applicable. The `modelOnly` flag is always present in
outputs to indicate these are engineering signals, not divine verdicts.

## `@moonwitness/explanation-engine`

Entry point: `src/index.ts`

### Types

- `ExplanationRecord` — `Record<string, unknown>`
- `TemporalExplanation` — structured explanation of temporal context with astronomical facts, mathematical derivations, quranic evidence boundary, and research hypotheses boundary
- `LegalExplanation` — formatted legal analysis for display

### Functions

- `explainTemporalContext(text, timeFactor)` — explains TSE context; returns `null` if the input does not match `MIZAN_TEMPORAL_CONTEXT_V1`
- `explainLegalResult(result)` — formats an existing legal analysis for display

### Determinism guarantees

Both functions are deterministic given the same inputs. `explainTemporalContext`
returns `null` for absent/invalid TSE contexts rather than throwing.

## `@moonwitness/witness`

Entry point: `src/index.ts`

Re-exports all public symbols from the following submodules:

- `witness-dag` — DAG primitives
- `distributed-witness` — export/import bundles and identity
- `merkle-proof` — Merkle proof generation and verification
- `signature-provider` — signing interfaces
- `witness-keyring` — key management
- `chunked-bundle` — chunked bundle transport
- `witness-projection-store` — projection storage
- `witness-transport` — `WitnessTransportService` for bundle import/export
- `single-node-keystore` — single-node key storage
- `local-checkpoint-store` — checkpoint persistence
- `witness-mizan` — Mizan commitment helpers
- `witness-observability` — observability hooks
- `witness-backup` — backup primitives
- `witness-diagnostics` — diagnostics helpers
- `local-dag-store` — local DAG persistence

## `@moonwitness/persistence`

Entry point: `src/index.ts`

Re-exports all public symbols from:

- `types` — core type definitions
- `ports` — persistence port interfaces
- `schema` — schema definitions
- `hash` — hashing utilities
- `memory` — in-memory adapter
- `file` — file-based adapter
- `postgres` — Postgres adapter
- `factory` — client factory
- `file-backup` — file backup utilities
- `idempotency` — idempotency runtime
- `postgres-idempotency` — Postgres-backed idempotency
- `runtime-data` — runtime data helpers
- `universe-store` — universe store facade
- `client` — `PersistenceClient`

### Host dependency note

The Postgres adapter requires `pg >= 8` as a peer dependency. The memory and
file adapters have no external runtime dependencies.

## `@moonwitness/data-access`

Entry point: `src/index.ts`

### Classes

- `UniverseDataClient` — facade over `PersistenceClient` exposing convenience methods for entities, relations, events, evidence, projections, and audit history

### Determinism

`UniverseDataClient` is a stateful facade over persistence. Its methods are
deterministic given the same store state, but it does not make temporal or
scoring decisions.

## `@moonwitness/kernel`

Entry point: `src/index.ts`

Re-exports from submodules:

- `boundaries` — boundary definitions
- `ids` — identifier utilities
- `rid` — RID (Resource Identifier) utilities
- `versioning` — versioning helpers
- `state-machine` — state machine primitives
- `compatibility` — compatibility helpers
- `relationship-hub` — relationship coordination
- `rule-resolution` — rule resolution
- `domain-types` — canonical domain type definitions
- `model-registry` — model registry

## `@moonwitness/jobs`

Entry point: `src/index.ts`

### Types

- `JobStatus` — `'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED'`
- `JobRecord<T, R>` — `{ id, type, status, payload, result?, error?, createdAt, updatedAt }`
- `JobHandler<T, R>` — `(payload: T) => Promise<R>`
- `JobQueuePort` — queue operations contract
- `JobQueueLifecyclePort` — `{ start(), stop() }`
- `WorkerQueuePort` — combined queue + lifecycle contract
- `WorkerRuntimeOptions` — `{ drainTimeoutMs? }`

### Functions

- `isTerminalJobStatus(status)` — returns `true` for `'COMPLETED' | 'FAILED'`

### Classes

- `PersistentJobQueue` — persistence-backed queue with explicit handler registration and polling lifecycle
- `WorkerRuntime` — owns worker lifecycle without owning application business logic

### Determinism

`PersistentJobQueue` is deterministic given the same store state and handler
registry. Job ordering follows insertion order within the polling loop.

## `@moonwitness/orchestrator`

Entry point: `src/index.ts`

### Types

- `WorkflowRecord` — `Record<string, unknown>`
- `WorkflowEvidence` — `{ evidenceId, sourceType?, reference?, status?, confidence?, payload? }`
- `AnalysisWorkflowInput` — input contract for analysis workflow
- `AnalysisWorkflowPorts` — injected port interfaces for analysis
- `AnalysisWorkflowResult` — `{ caseId, aggregate, analysis, witness }`
- `ObservationWorkflowInput` — input contract for observation workflow
- `ObservationWorkflowPorts` — injected port interfaces for observation
- `ObservationWorkflowResult` — `{ id, kind, status, entityId, version, event }`
- `EvaluationWorkflowInput` — input contract for evaluation workflow
- `EvaluationWorkflowPorts` — injected port interfaces for evaluation
- `EvaluationWorkflowResult` — `{ id, kind, status, witness, mizan, semantic, lifecycle, reviewGate, revelationScorecard }`
- `AnalysisCaseAggregate` — `{ id, type, version, status, observation, analysis, lifecycle, updatedAt, ownerRid? }`

Re-exported types from submodules:
- `EvidenceStatus`, `EvidenceRecord` (from `evidence-workflow`)
- `ReviewStatus`, `HumanDisposition`, `ReviewRecord`, `ReviewCreateInput`, `ReviewTransitionInput` (from `review-workflow`)
- `AiAnalyzeWorkflowInput`, `AiAnalyzeWorkflowPorts`, `AiAnalyzeWorkflowResult` (from `ai-analysis-workflow`)
- `IngressScheduleStatus`, `IngressScheduleRecord`, `CreateIngressScheduleInput`, `IngressSchedulePorts`, `IngressScheduleResult` (from `ingress-workflow`)

### Functions

- `toEvidenceObservations(evidence)` — converts persisted evidence into engine evidence-observation shape
- `runAnalysisWorkflow(input, ports)` — durable analysis workflow
- `runObservationWorkflow(input, ports)` — durable observation workflow
- `runEvaluationWorkflow(input, ports)` — durable evaluation workflow

### Input/Output contracts

**Analysis workflow input**
- `caseId`, `actorId`, `text`, `modelVersion`, `source` — required
- `options?`, `semanticObservation?`, `includeReminder?`, `reminderSeed?`, `ownerRid?` — optional

**Analysis workflow output**
- `caseId` — echoes input
- `aggregate` — `AnalysisCaseAggregate` with versioned CASE state
- `analysis` — raw engine analysis record
- `witness` — `WitnessReference` with `nodeId`, `hash`, `root`, `checkpointId`

**Evaluation workflow output**
- `status` — `'RESOLVED' | 'REVIEW_REQUIRED' | 'BLOCKED'` derived from `reviewGate.decision`
- All fields from `analysis` plus `reviewGate` and `revelationScorecard`

### Determinism

Workflows are deterministic given the same injected ports and inputs. The
`ports.now?.()` fallback to `new Date()` is the only source of non-determinism;
hosts should inject a clock for reproducible tests.

## `@moonwitness/cosmic-engine`

Entry point: `src/index.ts`

### Types

- `CosmicSemanticObservationStatus` — `'AVAILABLE' | 'UNAVAILABLE'`
- `CosmicSemanticObservation` — structured semantic observation with protocol, status, metadata, candidates, intentionSignals, diagnostics
- `MizanInput` — `Record<string, unknown>`
- `MizanResult` — `Record<string, unknown>`
- `MizanTemporalContext` — `Record<string, unknown>`

Re-exported types:
- `TSEInput`, `TSETemporalState` (from `tse-engine`)
- `AiProvider`, `LocalStructuredProvider`, `StaticSemanticProvider`, `HttpJsonAiProvider`, `RegistrySemanticProvider`, `providerDescriptor` (from `analysis`)

Re-exported functions:
- `calculateTemporalState`, `toMizanTemporalContext`, `compareTime`, `makeTimeEvent`, `now`
- `buildAnalyticalSemanticVector`, `SemanticRegistry`
- `explainLegalResult`, `explainTemporalContext`
- `evaluateMizan`, `evaluateQuranicMizan`
- `analyzeAutomatically`, `buildAiAnalysis`, `createDefaultSemanticProvider`

### Functions

- `evaluateMizanService(input)` — service wrapper around `evaluateMizan` with `MizanResult` return type
- `toCosmicSemanticObservation(raw)` — converts internal registry result into provider-safe observation
- `createCosmicEngine(root?)` — returns a frozen engine facade object

### Engine facade (`createCosmicEngine`)

The returned frozen object exposes:
- `calculateTemporalState(input)` — delegates to TSE
- `makeTimeEvent`, `compareTime`, `now` — temporal primitives
- `buildAnalyticalSemanticVector` — semantic vector builder
- `createSemanticRegistry(definitions?)` — registry factory
- `analyzeSemantic(text)` — semantic observation via default provider
- `evaluateMizan: evaluateMizanService` — Mizan evaluation
- `evaluateMizanModel: evaluateMizan` — raw Mizan evaluation
- `evaluateQuranicMizan` — Quranic Mizan evaluation
- `explainTemporalContext`, `explainLegalResult` — explanation helpers
- `analyze(text, temporalInput?)` — full analysis pipeline

### Determinism

`createCosmicEngine` is deterministic given the same `root` directory and
inputs. The default semantic provider reads from the filesystem at `root`; if
the underlying definition files change, results may differ. All engine math
functions (`calculateTemporalState`, `evaluateMizan`, `evaluateQuranicMizan`,
`buildAnalyticalSemanticVector`) are deterministic.

## `@moonwitness/sdk`

Entry point: `src/index.ts`

### Types

- `UniverseClientOptions` — `{ baseUrl?, fetchImpl?, headers?, timeoutMs?, maxRetries?, authMode?, session?, onSessionChange? }`

### Classes

- `UniverseApiError` — `Error` subclass with `status` and `body`
- `UniverseContractError` — `Error` subclass with `path` and `cause`
- `UniverseClient` — consumer-facing HTTP client

### Functions / Methods

- `new UniverseClient(options?)` — constructs client with retry, timeout, and auth refresh logic
- `register(input)` — register new user
- `login(input)` — authenticate and store session
- `refresh()` — refresh current session
- `logout()` — invalidate current session
- `me()` — fetch current user profile
- `xrpWorkspace()` — fetch XRP workspace summary
- `observe(input)` — create observation
- `analyze(input)` — run analysis
- `evaluate(input)` — run evaluation
- `query(input)` — run query
- `command(input, key?)` — run command with idempotency key
- `resource(id)` — fetch resource by ID
- `attachEvidence(id, input)` — attach evidence to resource
- `listEvidence(id)` — list evidence for resource
- `reviews()` — list reviews
- `createReview(input)` — create review
- `transitionReview(id, input)` — transition review state

### Input/Output contracts

All methods return promises that resolve to typed response bodies validated
against `@moonwitness/contracts` assertions. Errors throw `UniverseApiError`
(for HTTP failures) or `UniverseContractError` (for contract validation
failures).

### Host dependency

`UniverseClient` uses the global `fetch` API by default. It is host-dependent
because it communicates with a running `apps/api` instance.

## Architecture boundary

No package under `packages/` imports `fastify`, `express`, `hono`, or any
module from `apps/api`. This boundary is enforced by
`scripts/architecture-boundary.mjs`.

Compatibility shims that may appear in host adapters are documented separately
in `docs/COMPATIBILITY_POLICY.md`.
