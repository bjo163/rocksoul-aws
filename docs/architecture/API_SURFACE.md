# Cosmic Architecture — API Surface & Unified Engine Specification (Phase 4 & 7)

## 1. Unified Engine Facade Contract

Any external Node.js/TypeScript application can instantiate and interact with Cosmic through the canonical `@moonwitness/cosmic-engine` facade:

```ts
import { createCosmicEngine, type CosmicEngine, type CosmicEngineConfig } from '@moonwitness/cosmic-engine';

const cosmic: CosmicEngine = await createCosmicEngine({
  logLevel: 'info',
  storage: { type: 'memory' }, // or 'file' | 'postgres'
});
```

---

## 2. Core Operations Specification

### 2.1 `cosmic.analyze(input)`
Analyzes raw natural language or structured case inputs, producing full moral-semantic vectors, RGBL grounding, intent classification, time factor correlation, and human review gate assessments.

```ts
const result = await cosmic.analyze({
  text: "Pengembalian aset titipan dilakukan setelah verifikasi bukti kepemilikan sah.",
  caseId: "CASE-2026-001",
  options: { includeProof: true }
});
```

### 2.2 `cosmic.query(input)`
Executes deterministic semantic, ontological, or astronomical queries against the knowledge kernel and Revelation indices.

```ts
const queryResult = await cosmic.query({
  concept: "AMANAH_INTEGRITY",
  maxDepth: 3,
  includeProvenance: true
});
```

### 2.3 `cosmic.evaluate(input)`
Performs mathematical and ethical balance evaluations using the Mizan engine.

```ts
const evaluation = await cosmic.evaluate({
  entityId: "EVAL-001",
  text: "Distribusi bantuan sosial darurat kepada wilayah terdampak bencana",
  domain: "SocialProtection"
});
```

### 2.4 `cosmic.explain(input)`
Generates human-readable provenance trees, decision rationale, and transparent audit trails for any prior evaluation.

```ts
const explanation = await cosmic.explain({
  evaluationId: "EVAL-001",
  verbosity: "detailed"
});
```

### 2.5 `cosmic.execute(workflow, input)`
Executes durable business workflows (e.g. multi-party evidence recording, human review disposition, asynchronous background processing).

```ts
const workflowResult = await cosmic.execute('EVIDENCE_ATTACHMENT', {
  caseId: "CASE-2026-001",
  evidence: {
    evidenceId: "EVD-001",
    sourceType: "DOCUMENT",
    status: "VERIFIED",
    confidence: 0.95
  }
});
```

---

## 3. Host-Neutral Runtime Guarantees

- **No Global Process State**: All configurations and state are bound to the `CosmicEngine` instance.
- **Port-Injected Persistence**: Adapters (Postgres, File, Memory) are passed via dependency injection.
- **Pure NodeNext Modules**: Clean ES Module exports with explicit `.d.ts` definitions.
- **Deterministic Offline Defaults**: Fully operational offline with pure analytical registries.
