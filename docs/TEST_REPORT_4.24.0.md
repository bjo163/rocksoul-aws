# Test Report — v4.24.0

## Corpus integrity

- Qur'an: 6,236 / 6,236 — PASS
- Tawrat textual witness: 5,852 / 5,852 — PASS
- Zabur textual witness: 2,461 / 2,461 — PASS
- Injil textual witness: 3,779 / 3,779 — PASS
- Total Revelation passages: 18,328 / 18,328 — PASS
- Corpus fingerprint: `39555595fc3e9f166ec02693be29dfc7b9165b0b1b2c39bc499914f63f047357`
- Per-file SHA-256 validation — PASS
- Required textual-witness boundary fields — PASS

## Typed seed/install

- Manifest sources: 99
- Expected seed entities: 18,563
- Revelation typed entities: 18,328 / 18,328 — PASS
- Qur'an typed rows: 6,236 — PASS
- Tawrat typed rows: 5,852 — PASS
- Zabur typed rows: 2,461 — PASS
- Injil typed rows: 3,779 — PASS
- Seed SHA reconciliation — PASS
- Seed verifier structured-source duplicate-discovery regression — PASS
- Runtime dataset initialization from seeded persistence — PASS
- All four full-text corpus channels visible after runtime initialization — PASS
- Derived corpus index — PASS
- Derived Pure Revelation Asma index — PASS
- Derived Revelation Moral Graph index — PASS
- Derived-index fingerprint verification — PASS

## Canonical ten cases

`REVELATION_10_CASE_SMOKE_V2`: 10 / 10 expected conditional directions PASS.

- corruption/bribery — NEGATIVE
- embezzlement — NEGATIVE
- restitution — POSITIVE
- deliberate lying — NEGATIVE
- accusation without evidence — NEGATIVE
- verification before sharing — POSITIVE
- public-budget misuse — NEGATIVE
- smoking — UNRESOLVED without an admitted empirical bridge
- helping learning — POSITIVE
- taking/keeping another person's property — NEGATIVE

All ten preserve `finalDivineJudgmentComputed=false`. Textual witnesses cannot create or reverse direction. The suite reports `pureRevelationDerived=1/10`; the remaining cases retain transparent transitional language/action binding.

## Regression

- `npm run test:revelation` — PASS
- `npm run test:semantic` — PASS
- `npm run test:witness` — PASS
- `npm run build:api` — PASS after satisfying the workspace-declared Node type dependency
- `npm run final:certify` — PASS
- contract validation — PASS
- repository preflight — PASS
- file-driver `db-install` end-to-end — PASS

## Deployment boundary

No live PostgreSQL service was available in the build environment, so the release does not claim live PostgreSQL execution certification. PostgreSQL code paths, seed contracts, runtime initialization, and typecheck/build are present; a target deployment should still run `npm run install:interactive` or `npm run db:install` against the actual PostgreSQL instance.
