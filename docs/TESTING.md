# Universe OS — Testing & Certification

## Layered tests

1. Syntax/transpile validation for TS/TSX.
2. Contract/schema validation.
3. Engine smoke/certification.
4. AI → Mizan → Lifecycle integration.
5. Persistence/restart/idempotency/replay.
6. Native HTTP API tests.
7. Web/UI contract tests.
8. Hardcode/semantic hygiene scans.
9. Witness/Q-DAG integrity and cryptographic regression tests.
10. Single-node keystore restart, encryption, lifecycle, and local checkpoint persistence tests.

## Current verification commands

```bash
npm run test:semantic
npm run test:witness
npm run test:revelation
npm run test:event
npm run build:api
npm run preflight
npm run db:verify
npm run db:runtime-verify
npm run test:persistence-boundary
npm run test:visual
npm run test:api-cookie-session
node scripts/transpile-runner.mjs tests/semantic-realcases.test.ts tests/api-web-contract.test.ts
```

`npm run test:visual` compares 16 credential-free screenshot baselines: CAB, public web, XRP, and Flow in Lunar/Solar modes at desktop and mobile viewports. It serves the already-built public web with its production preview command, avoiding Cloudflare development-worker differences in screenshot runs. Use `npm run test:visual:update` only when an intentional reviewed UI change requires new baselines. `npm run test:api-cookie-session` covers browser sessions, public RID-claim rejection, admin-only immutable RID binding, stale-session revocation, XRP same-RID sharing, cross-RID projection isolation, server-side owner stamping, no-RID rejection, removal of evidence/reviewer-note content, cross-RID object denial, public evidence status limits, reviewer assignment isolation, production disclosure/auth boundaries, and concurrent Flow human-review/Witness convergence.

Live database commands require their corresponding deployment dependencies and services. Semantic and witness suites are designed to run without a network service.

The API test suite runs against the native HTTP server and covers health, AI analysis, authentication, case persistence, replay, audit integrity, and idempotency. Persistence recovery tests use a temporary file store and simulate a process restart by closing and reopening the provider. `npm run test:persistence-boundary` verifies that business/application source contains no SQL, only the six approved data adapters contain statements, runtime schema DDL cannot escape migrations, and runtime values are never interpolated into statements.

The 2026-08-22 backend closure run additionally passed `npm --prefix apps/api test` at 1,007/1,007, `npm test`, all four application builds, migration contracts, production preflight with zero warnings, `npm audit --omit=dev --audit-level=high` with zero vulnerabilities, development/staging workflow certificates, and `db:verify` plus `db:runtime-verify` for development, staging, and production-simulation.

## Robust Data-Driven Testing (Matrix Engine)
Our testing infrastructure utilizes a powerful data-driven generator (`generate-test-cases.js`) that spawns over 1000+ deterministic JSON cases to thoroughly assault the API routes, ensuring 100% test coverage across:
- **Authentication & Security:** Login matrix, route-specific throttling, signed access-token verification, durable revocation, refresh rotation/replay rejection, browser cookie transport, SDK session lifecycle, and online tracking (`/api/v1/auth/online`).
- **Kernel Abstractions:** Semantic registries, graph integrity checks, metrics.
- **Workflow Engines (CAB & Justice):** Event-sourced commands pushing multi-stage workflow transitions.
- **Resource Flow:** Ledger validations and Zakat/Finance event tracking.

All cases are compiled and run automatically when executing `npm run test` inside the API workspace.

## Canonical end-to-end flow

```text
INSTALL
→ SEED
→ AUTH
→ CREATE CASE
→ OBSERVE
→ ANALYZE
→ MIZAN
→ QUEUE
→ WORKER
→ PERSIST
→ RESTART
→ RELOAD
→ REPLAY
→ VERIFY
→ WEB
```

## Optional database drivers

`better-sqlite3` is an optional peer dependency, whereas `pg` is now fully integrated. Without them, migration contract tests still run. Live database tests use the configuration provided in `config/database.yaml`.


## Witness cryptographic tests (v4.19 baseline retained in v4.20)

```bash
npm run test:witness
npm run test:revelation
npm run test:event
```

The command retains all v4.15-v4.18 regressions and adds `tests/single-node-completion.test.ts`, `tests/file-provider-concurrency.test.ts`, and `tests/api-witness-single-node.test.ts`. v4.19 verifies canonical Q-DAG persistence across reopen, Mizan hash-only commitment, raw-text exclusion, backup manifest/root verification, non-destructive restore, restored key/checkpoint validity, `HEALTHY` diagnostics, concurrent file persistence safety, and HTTP restart persistence.

PostgreSQL projection behavior still requires an accessible PostgreSQL instance for live certification; the repository does not claim a live database pass when no server is available.


Operator recovery verification is also available with `npm run witness:recovery-drill`; it uses the latest real backup but restores only into a temporary directory.

## Qur'anic Mizan semantic tests — v4.20

```bash
npm run test:semantic
```

The suite now includes `tests/quranic-mizan.test.ts`. In addition to semantic regressions it validates all Qur'an references against the bundled Arabic corpus, provisional-vs-established evidence behavior, coercion/mistake context, no inherited burden, indirect smoking grounding, reserved unseen outcomes, non-moral 0..1 Action Gates, positive-deed representation, restitution vs theft disambiguation, defamation harm, and separate harm/benefit channels with no claimed divine netting rule.


## v4.21 Four-book Revelation Core

Normative reasoning is restricted to Al-Qur'an, Tawrat, Zabur, and Injil, with Al-Qur'an primary/Muhaimin. External research and historical metadata cannot contribute normative weight. The engine distinguishes scripture text from metadata and distinguishes a place mentioned in a passage from the place where that passage was revealed. Tawrat/Zabur/Injil transmitted textual-witness corpora are now bundled and seeded for corroboration only; they are not equated with the original revealed texts and cannot establish or reverse primary moral direction. See `REVELATION_SEMANTIC_CORE.md`.

## v4.21 Revelation Semantic Core

Run the scripture-core verification independently:

```bash
npm run test:revelation
npm run test:event
```

Generate the deterministic research snapshot from the bundled runtime corpus:

```bash
npm run revelation:research
```

The test asserts the four-book source policy, 6,236 bundled Qur'an ayahs, literal place-mention counts, the place/revelation-location separation, and corpus-derived Allah-attribute candidate provenance. v4.23 bundles Tawrat/Zabur/Injil textual-witness corpora and tests their exact record counts, equal confidence-only role, source boundaries, and zero-score behavior when witness text is absent. Tests must never synthesize missing scripture.

## v4.22 Asma/Revelation certification

Run:

```bash
npm run test:revelation
npm run test:event
npm run test:semantic
npm run test:witness
npm run test:revelation
npm run test:event
tsc -p apps/api/tsconfig.json --noEmit
```

The v4.22 Revelation test checks deletion of the 99-name runtime files, corpus provenance on every candidate, explicit relation examples (`Q2:195`, `Q2:190`, `Q16:90`, `Q39:53`, `Q2:77`), semantic-field method, moral-graph RGBL lanes, and core boundaries.


## v4.24 typed Revelation installation certification

Run:

```bash
npm run test:revelation
npm run test:event
npm run test:semantic
npm run test:witness
npm run build:api
npm run final:certify
npm run preflight
```

`tests/revelation-seed-install.test.ts` seeds the complete manifest into in-memory persistence and verifies 18,328 typed Revelation passage rows, seeded-runtime loading, all four full-text channels, derived corpus/Asma/Moral-Graph indexes, corpus fingerprint consistency, and the 10-case smoke matrix. A separate file-driver `db-install` run is used as the end-to-end persistence/install regression.

The v4.25 ten-case result is 10/10 expected conditional directions and **9/10 `pureRevelationDerived` for normative direction after language parsing**. The remaining smoking case is intentionally `UNRESOLVED` because no allowed empirical bridge is present. `revelationAlignmentScore` is grounding/alignment confidence, not sin severity; `analyticalScore` remains non-normative engineering magnitude.

## v4.25 native-binding certification

`tests/revelation-native-binding.test.ts` asserts that the language-query profile contains no verse references or moral scores and that runtime Qur'an retrieval derives direction for corruption, restitution, lying, defamation, verification, helping, and theft while smoking remains unresolved. `tests/revelation-seed-install.test.ts` additionally verifies the Native-Binding derived index and profile SHA after seed.


## v4.26 Revelation-grounded scoring certification

`tests/revelation-magnitude.test.ts` verifies that the core semantic engine no longer imports `action-semantics.json` for RGBL/OUT magnitude; negative and restorative cases derive sparse Revelation-grounded signals; Blue remains epistemic rather than moral benefit; and smoking remains zero-magnitude/`UNRESOLVED`.

Install certification now requires nine derived Revelation indexes: `CORPUS`, `ASMA`, `MORAL-GRAPH`, `NATIVE-BINDING`, `SCORING`, `EVENT-INTERPRETER`, `MORAL-LIFECYCLE`, `GRAMMAR`, and `DIVINE-ONTOLOGY`. The scoring index pins the current corpus fingerprint plus the scoring-profile/OUT-registry fingerprint. The canonical 10-case matrix remains 10/10 for expected conditional direction and 9/10 native Revelation-derived direction, with tobacco smoking deliberately unresolved.

## v4.27 event adversarial certification

The canonical Event Interpreter suite contains 100 cases across direct violation, negation, violation→restoration, mistake, permission, lying, principle conflict, unsupported accusation, verification, and helping. The suite requires 100/100. It verifies software parsing/binding behavior, not exhaustive divine judgement.

## v4.28 Lifecycle certification

Release certification adds a 10-case lifecycle install smoke matrix and a 100-case lifecycle adversarial suite covering active violation, acknowledgement, regret, cessation, declared repentance, restitution, repair, restorative trajectory, relapse and constructive action. Installation now verifies seven derived Revelation indexes.

## v4.29 Grammar certification

Release certification adds a real-corpus grammar test and a 100-case grammar adversarial matrix. Negation regressions cover Q7:28, Q4:48 and Q6:144. The existing 10-case Revelation, 100-case Event, 100-case Moral Lifecycle, semantic/Mizan and Witness suites remain required. Install verification now requires nine derived Revelation indexes.


## v4.30 ontology certification

`tests/revelation-divine-ontology.test.ts` validates explicit relation families, polarity, provenance, and Moral Graph linkage. `tests/revelation-divine-ontology-100-cases.test.ts` audits 100 discovered concepts for valid Qur'an provenance and the non-canonical-name boundary. `npm run test:ontology` runs both.
