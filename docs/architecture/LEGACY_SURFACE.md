# Cosmic Architecture — Legacy Surface & Migration Bridge (Phase 1 & 15)

## 1. Zero-Destruction Migration Guarantee

Per architectural policy, legacy code in root `src/` is never removed in a "big-bang" demolition. Instead:
1. Every capability is systematically ported to a dedicated workspace package (`packages/<pkg>/`).
2. Canonical unit and contract tests are created for each package.
3. Host applications (`apps/api`) and external consumers are migrated to import from `@moonwitness/<pkg>`.
4. Legacy files remain available as re-export wrappers or fallback bridges until all external callers and tests are 100% verified.

---

## 2. Legacy Module Status & Bridge Map

| Legacy File | Primary Target Package | Status |
| :--- | :--- | :--- |
| `src/config-loader.ts` | `@moonwitness/persistence/config-loader` | Packageized (Tests 100% Passing) |
| `src/domains/*.ts` (12 files) | `@moonwitness/domains` | Packageized (10 domain profiles typed) |
| `src/access/postgres-auth.ts` | `@moonwitness/security/postgres-auth` | Packageized (Zero-Any Compliant) |
| `src/audit/replay.ts` | `@moonwitness/orchestrator/audit` | Packageized (`replayCaseEvents` exported) |
| `src/observability/trace-redaction.ts` | `@moonwitness/observability` | Packageized (Tracing & metrics active) |
| `src/ai/general-analyzer.ts` | `@moonwitness/cosmic-engine` & `@moonwitness/semantic-engine` | Active Facade Bridge |
| `src/ingress/divine-ingress.ts` | `@moonwitness/orchestrator/ingress-workflow` | Packageized |
| `src/ingress/revelation-reminder-engine.ts` | `@moonwitness/orchestrator` | Phase 8 migration target |
| `src/revelation/revelation-semantic-core.ts` | `@moonwitness/revelation` | Packageized |
| `src/revelation/asma/asma-engine.ts` | `@moonwitness/revelation` | Packageized |

---

## 3. Allowed Legacy Import Baseline

Architecture boundary checks (`scripts/architecture-boundary.mjs`) strictly guard the boundary between host apps and root `src/`. Currently, only 10 legacy imports remain in `apps/api/src/routes/v1.routes.ts` (allowlist threshold: 23).
