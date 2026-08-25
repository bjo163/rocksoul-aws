# Demo database workflow

`db:install` remains the canonical production-safe database installer. Demo data is intentionally separate.

## Scenario preview

Run the scenario preview directly while the package script is being finalized:

```text
node scripts/transpile-exec.mjs scripts/db-demo.ts --scenario=basic
node scripts/transpile-exec.mjs scripts/db-demo.ts --scenario=review
node scripts/transpile-exec.mjs scripts/db-demo.ts --scenario=full
```

Available scenarios:

- `basic` — minimal representative universe
- `review` — review-oriented case and evidence
- `full` — showcase scenario for API/UI E2E

The current command is deliberately a preview/contract layer. It must not mutate a production database. Persistence-backed loading will be added only after the HTTP/API demo contract is stable.
