# Release test suites

`tests/release/` contains the canonical entrypoints used by the PR/release gate. The historical source tests remain in their established paths to preserve regression references and avoid path churn.

- `semantic/` — semantic and Mizan contracts
- `witness/` — Q-DAG, checkpoint, persistence, and single-node witness contracts
- `revelation/` — Revelation corpus, grammar, ontology, binding, and install contracts
- `event/` — Event Interpreter and Moral Lifecycle certification
- `security/` — authentication, authorization, provenance, and production boundaries
- `persistence/` — SQL/application and evidence/reanalysis boundaries
- `ui/` — shared UI, accessibility, governed UI, and XRP/Flow contracts
- `production/` — production certification and human-review workflow contracts

Use `npm run test:release` for the focused release gate. Use `npm run test:full` for the complete regression suite.
