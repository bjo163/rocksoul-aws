# MoonWitness OS v4.28.0 — Moral Lifecycle Engine

v4.28 adds a Revelation-grounded moral lifecycle layer on top of the v4.27 Semantic Event Interpreter while preserving the single-node Witness/Q-DAG architecture.

## Added

- `src/events/moral-lifecycle.ts` lifecycle state/trajectory engine.
- `src/revelation/lifecycle/` Quran-primary lifecycle grounding with equal confidence-only Tawrat/Zabur/Injil corroboration.
- non-normative lifecycle language profile and Revelation query profile.
- `GET /api/v1/revelation/lifecycle`.
- `REVELATION-INDEX::MORAL-LIFECYCLE` as the seventh derived Revelation index.
- 10-case install lifecycle smoke matrix.
- 100-case lifecycle adversarial suite.
- `moralLifecycle` in semantic/API analysis output.
- Q-DAG Mizan commitments now hash the combined case lifecycle + moral lifecycle payload at API commit points.

## Safety / epistemic boundary

The engine may detect reported awareness, regret, cessation, repentance declaration, restitution, repair, human reconciliation, persistence and relapse. It never converts these signals into a claim that Allah accepted repentance or granted forgiveness. Restoration does not erase the historical violation record.
