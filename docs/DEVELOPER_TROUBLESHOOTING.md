# AWS Developer Troubleshooting

Use this matrix to reproduce common local/CI failures from a clean checkout. Current runtime support and release scope are defined by `docs/TESTING.md` and `docs/operations/CURRENT_CERTIFICATION_SCOPE.md`.

| Symptom | First diagnostic | Reproduction / recovery |
|---|---|---|
| Wrong Node/npm version or install differs from CI | `node --version && npm --version` | Use Node 26 and npm 11, then run `npm ci` from a clean checkout. |
| Repository/environment preflight fails | `npm run preflight` | Resolve the first named diagnostic, then rerun preflight; do not bypass a failed prerequisite. |
| Package/workspace dependency drift | `npm run dependency:integrity` | Synchronize the lockfile as CI does, inspect the diff, rerun dependency integrity and `npm ci`. |
| PostgreSQL connection/bootstrap fails | `npm run db:status` and `docs/POSTGRES.md` | Use the supported PostgreSQL 18 bootstrap/interactive-install path, verify credentials/environment, then run the explicit PostgreSQL lane. |
| Docker/PostgreSQL certification container is unhealthy | `docker ps -a` and container logs | Confirm Docker access, free ports/disk, and reproduce with the image/config used by `.github/workflows/certification.yml`. |
| Generated tests or isolated execution report unexpected totals | inspect generated inputs and stale build output | Regenerate through the owning suite/cleanup path. `scripts/transpile-runner.mjs` intentionally excludes stale `dist` trees from isolated source tests. |
| Targeted test passes but release gate fails | `npm run release:check` | Treat targeted tests as debugging only. Fix the first release-gate failure and rerun the mandatory full gate. |
| API works in file/memory mode but fails in integration | verify `STORAGE_DRIVER` and PostgreSQL env | Reproduce through the explicit PostgreSQL lane; file/memory results are not live PostgreSQL evidence. |
| AWS CI remains queued | inspect workflow/job status and issue #71 | Full certification uses the self-hosted runner. Restore runner availability; a queued run is not release evidence. |
| CI failure cannot be reproduced locally | record exact SHA, run/job ID, failing step/test IDs and logs | Check out the exact SHA and reproduce with the same Node/npm/PostgreSQL/Docker contract, then run the closest owning suite followed by the release gate. |
| Disk/temp exhaustion or unexplained Docker failure | inspect filesystem, Docker disk usage, temp space | Free safe build/container artifacts, preserve failure logs, and retry from a clean workspace. Persistent runner capacity belongs in #71. |
| Staging smoke fails after local certification | inspect readiness, deployment env, PostgreSQL connectivity and logs | Follow #24 plus deployment/recovery docs; local certification does not replace target-environment deploy/restart/backup evidence. |

## Clean-checkout reproduction sequence

```bash
node --version
npm --version
npm ci
npm run dependency:integrity
npm run preflight
npm run certify:current
```

For changes touching release-owned API/runtime/security/persistence/worker/Witness behavior, follow with the owning focused suite and full release gate. For PostgreSQL-owned behavior, use the explicit PostgreSQL lane against a real PostgreSQL instance.

## Evidence discipline

Always record the exact commit SHA and first causal failure. Queued, cancelled, partial, historical, local-only, or different-SHA runs do not certify a candidate. Do not remove tests, downgrade a gate, switch persistence drivers, or bypass the self-hosted certification lane merely to obtain a green result.
