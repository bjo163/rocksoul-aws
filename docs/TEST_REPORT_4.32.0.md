# Test Report — 4.32.0

Audit date: **2026-08-22**

## Verified in the current workspace

- API build: PASS
- Web build: PASS
- Semantic suite: PASS
- Witness suite: PASS
- Human Review Gate suite: PASS
- API data-driven/E2E/SQLite/AI suite: **1,007/1,007 PASS**
- Web contract suite: **11/11 PASS**
- Evidence attach → re-analysis integration: PASS
- Evaluation → review gate → Witness envelope integration: PASS
- Windows `preflight`: PASS
- Windows `final:certify`: PASS
- SDK/contracts TypeScript check: PASS
- Release identity consistency check: PASS (`npm run release:identity`)
- HTTP malformed/oversized-body boundary test: PASS
- Review workflow transition test: PASS
- API suite from `apps/api` working directory: **1,007/1,007 PASS**
- CAB contract suite: **11/11 PASS**
- Public web contract suite: **2/2 PASS**
- CAB and public web production builds: PASS
- Shared UI cross-application contract: PASS
- Immutable evidence overwrite/supersession integration: PASS
- Review queue API lifecycle integration: PASS
- Complete root regression command (`npm test`): PASS
- Current certification command (`npm run certify:current`): PASS
- GitHub Actions Linux certification for baseline commit `7b14b72`: PASS ([run 32550799798](https://github.com/bjo163/cosmic/actions/runs/32550799798))
- Public Sites deployment from source commit `738dd89`: PASS ([MoonWitness OS public home](https://moonwitness-os.rocksoultech.chatgpt.site))
- Public production response/title handoff: PASS

## Boundaries

- Live PostgreSQL installation, migration, backup, restore, and production connection certification still require a provisioned deployment target.
- Browser HttpOnly token storage, durable revocation across instances, distributed rate limiting, and live PostgreSQL certification remain open deployment work.
- Public hosting is active from a committed source version; CAB remains intentionally excluded from the public deployment surface and still requires its own authenticated/private production target.
- Engine protocol snapshots may retain their own historical protocol versions such as 4.29 or 4.30; those are not the application release identity.
- This report certifies the listed checks only and does not claim Divine judgement, exhaustive linguistic understanding, or empirical truth about an external event.
