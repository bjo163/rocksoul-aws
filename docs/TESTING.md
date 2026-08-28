# Cosmic Engine/API — Testing and Certification

Testing follows the current engine/API-only architecture. Product browser applications and screenshot/accessibility/localization suites are owned by product repositories, not by Cosmic.

## Test layers

1. Package build/runtime contracts.
2. Deterministic TSE/temporal gold and regression tests.
3. Semantic, Revelation, Event, Mizan, and explanation tests.
4. Orchestrator workflow tests with injected ports.
5. Generic Entity/Relation/Event/Evidence/Case and API contract tests.
6. Authentication, authorization, idempotency, rate-limit, and security tests.
7. Persistence migration/conformance/restart/replay/atomicity tests.
8. Worker/jobs lease/retry/dead-letter tests.
9. Witness/Q-DAG integrity, checkpoint, backup, and recovery tests.
10. PostgreSQL live certification and Docker/release certification.

## Primary commands

```bash
npm run test:engine
npm run test:tse
npm run test:orchestrator
npm run test:packages
npm run test:persistence-boundary
npm run test:http-security
npm run test:release
npm run test:postgres
npm run build:api
npm run certify:current
```

The release workflow also executes documentation, architecture, release-scope, dependency, lint, typecheck, identity, PostgreSQL, final-certification, and Docker gates.

## Canonical engine flow

```text
INPUT / OBSERVATION
  ↓
TEMPORAL / TSE
  ↓
SEMANTIC / EVENT INTERPRETATION
  ↓
EVIDENCE / REVELATION BOUNDARY
  ↓
MIZAN
  ↓
BOUNDED EXPLANATION
  ↓
ORCHESTRATOR
  ↓
PERSIST / EVENT
  ↓
WITNESS / AUDIT
  ↓
RESTART / REPLAY
  ↓
VERIFY
```

## Persistence support

Supported runtime drivers are PostgreSQL for production/integration, file for portable standalone operation, and memory for ephemeral tests. SQLite is not part of the supported current runtime surface.

Live PostgreSQL results are claimed only when an accessible PostgreSQL instance was actually exercised. Static migration contracts do not count as a live database pass.

## Exact-SHA evidence

A queued, cancelled, partial, historical, local-only, or different-SHA result is not release certification evidence. The exact candidate SHA must complete all mandatory gates.

## Compatibility coverage

Legacy/compatibility API aliases may remain while consumers migrate, but tests must assert their backend semantics directly. Tests may not depend on Web/CAB/XRP/Flow implementation files to prove an engine/API invariant.

## Revelation and epistemic boundaries

The existing Revelation, grammar, lifecycle, ontology, and four-book regression suites remain required according to their package/test ownership. Tests verify software parsing, provenance, structural grounding, and deterministic analytical behavior; they do not assert exhaustive divine judgement.
