# Test Report — v4.20.0

## Verified in build environment

### Semantic regression

`npm run test:semantic` — **PASS**

Covered suites:

- automatic semantic engine: 3/3 PASS
- AI → Mizan contract: 2/2 PASS
- analyzer semantic priorities: 7/7 PASS
- Qur'anic Mizan: 12/12 PASS
- zero-dependency operational config parser: 2/2 PASS

Qur'anic Mizan checks include:

1. every registered Qur'an reference resolves to the bundled Qur'an corpus;
2. unverified accusation → `PROVISIONAL`;
3. verified factual evidence may → `ESTABLISHED` without becoming a divine verdict;
4. coercion/mistake affect responsibility context;
5. burden is never transferred to another person;
6. intention never sets `heartKnown=true`;
7. smoking remains `INDIRECT` grounding and requires empirical evidence;
8. final-destination request → `RESERVED`;
9. unknown text → `INSUFFICIENT_EVIDENCE`;
10. Action Gate values remain 0..1 epistemic/context signals;
11. beneficial deeds create positive benefit signals without manufactured accountability risk;
12. restitution is distinguished from theft/generic helping;
13. defamation preserves dignity/truth/trust harm while its factual accusation remains provisional;
14. harm and benefit stay separately visible and a legacy net score is not labelled a divine cancellation rule.

### Ten-case semantic matrix

`tests/semantic-realcases.test.ts` — **PASS**

The matrix covers corruption, restitution, lying, unverified accusation/defamation, verification before sharing, smoking, helping, and theft. Positive cases no longer receive moral risk solely because contextual magnitude exists.

### API ↔ Web contract

`tests/api-web-contract.test.ts` — **PASS**, 16 routes checked.

### Witness/runtime regression

`npm run test:witness` — **PASS**.

The v4.15–v4.19 Q-DAG, signature, keystore, backup/recovery, concurrency, and HTTP restart tests remain green with the v4.20 semantic layer. The deployment architecture remains single-node.

### Type/syntax validation

- API TypeScript `tsc --noEmit`: **PASS**.
- Changed TS/TSX modules, including AI Playground, Qur'anic Mizan, semantic engine, Mizan engine, config loader, witness route, and API app: **PASS** via TypeScript transpile diagnostics.

## Still environment-dependent

- live PostgreSQL certification;
- production filesystem/permissions certification;
- production secret custody;
- native web dependency/bundler certification in a clean deployment.

These are deployment certification boundaries. This release does not claim theological infallibility: verse-to-software mappings are explicit, auditable engineering interpretations and final divine judgment remains outside the model.
