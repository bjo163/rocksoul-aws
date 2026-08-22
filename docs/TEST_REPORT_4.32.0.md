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
- CAB contract suite: **16/16 PASS** after removal of public self-registration
- Public web contract suite: **2/2 PASS**
- CAB, public web, XRP, and Flow production builds: PASS
- Shared UI + XRP/Flow + accessibility + governed-state contracts: **16/16 PASS**
- XRP live workspace RID-isolation/sanitization integration: PASS
- Automated visual regression: **16/16 screenshot baselines PASS** (4 applications × 2 themes × desktop/mobile)
- Browser/File/SDK session lifecycle suites: **8/8 PASS**
- Browser QA: public web, CAB login, XRP secure state, Flow desktop/governed panels, Solar/Lunar, Indonesian/English, and corrected 390 px Flow layout: PASS
- XRP-origin login → Flow-origin shared HttpOnly session → logout smoke: PASS
- Dependency audit after Cloudflare toolchain update: **0 known vulnerabilities**
- Backend production-boundary suite: PASS — minimal anonymous health, authenticated internal diagnostics, protected observe/analyze/query, requester-scoped jobs
- RID lifecycle suite: PASS — public claim rejection, admin-only immutable binding, durable binding audit, stale-session revocation, successful RID-scoped relogin
- XRP/Flow concurrency suite: PASS — actor/operation idempotency, reviewer assignment isolation, optimistic version checks, one review/one Witness result under concurrent replay
- Live administrator RID verification: PASS for development, staging, and production-simulation
- PostgreSQL database/runtime verification: PASS in all three local environments after backend hardening
- Production preflight: PASS with zero errors and zero warnings
- Immutable evidence overwrite/supersession integration: PASS
- Review queue API lifecycle integration: PASS
- Complete root regression command (`npm test`): PASS
- Current certification command (`npm run certify:current`): PASS
- GitHub Actions Linux certification for baseline commit `7b14b72`: PASS ([run 32550799798](https://github.com/bjo163/cosmic/actions/runs/32550799798))
- Public Sites deployment from source commit `738dd89`: PASS ([MoonWitness OS public home](https://moonwitness-os.rocksoultech.chatgpt.site))
- Public production response/title handoff: PASS

## Boundaries

- The three local PostgreSQL databases are schema-7 certified; every external production target still requires its own installation, recovery, and connection certification.
- Browser HttpOnly storage, rotating refresh sessions, and restart-safe revocation are implemented. Signing-key operations, distributed rate limiting, and forced multi-instance failure drills remain open deployment work.
- Public hosting is active from a committed source version; CAB remains intentionally excluded from the public deployment surface and still requires its own authenticated/private production target.
- XRP and Flow have independent local packages/builds/routes; XRP now consumes a live RID-scoped API projection, but neither application yet has a certified separate production deployment.
- Engine protocol snapshots may retain their own historical protocol versions such as 4.29 or 4.30; those are not the application release identity.
- This report certifies the listed checks only and does not claim Divine judgement, exhaustive linguistic understanding, or empirical truth about an external event.
