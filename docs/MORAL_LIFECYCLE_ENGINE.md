# Moral Lifecycle Engine

Version: **4.28.0**

The Moral Lifecycle Engine sits after the non-normative Semantic Event Interpreter and before downstream Mizan reporting. It tracks how an observed/reported moral event changes over time without deleting the original event and without claiming knowledge of divine acceptance.

## Canonical flow

`EVENT GRAPH → LIFECYCLE SIGNALS → REVELATION LIFECYCLE GROUNDING → TRAJECTORY → MIZAN / Q-DAG PROVENANCE`

Tracked analytical stages include awareness, regret, cessation, declared return/repentance, restitution, repair, human reconciliation, persistence, relapse, and forgiveness requests. The language surfaces in `data/events/moral-lifecycle-language-profile.json` are parsing aids only (`normativeAuthority=false`). Quran corpus search surfaces in `data/revelation/lifecycle-query-profile.json` contain no verse IDs and no moral score. Runtime verse references are discovered from the corpus.

## Trajectory states

- `VIOLATION_ACTIVE`
- `VIOLATION_ACKNOWLEDGED`
- `RETURN_DECLARED`
- `CESSATION_REPORTED`
- `RESTITUTION_IN_PROGRESS`
- `REPAIRING`
- `RESTORATIVE_TRAJECTORY`
- `RELAPSE`
- `CONSTRUCTIVE`
- `UNRESOLVED`

Restoration is never arithmetic cancellation. A historical violation remains in the event/Q-DAG provenance even when later cessation, restitution or repair is observed.

## Revelation boundary

Qur'an is primary/Muhaimin. Tawrat, Zabur and Injil textual witnesses can only corroborate lifecycle grounding confidence. They cannot create a lifecycle moral direction or override the Qur'an.

The engine never computes:

- sincerity of repentance;
- acceptance of repentance by Allah;
- divine forgiveness of a person;
- hidden-heart truth;
- final destination or final divine weighing.

A phrase such as “I repented” is represented as `repentanceDeclared=true`, not `repentanceAccepted=true`.

## Persistence / install

The installer seeds both lifecycle profiles and builds `REVELATION-INDEX::MORAL-LIFECYCLE`. Its fingerprint binds the language profile and Revelation lifecycle query profile to the current corpus fingerprint. `revelation:install-verify` checks the index and runs the 10-case lifecycle smoke matrix after reopening persistence.

## Verification

- 10-case installation smoke matrix.
- 100-case lifecycle adversarial matrix.
- Existing 100-case event interpreter regression.
- Semantic/Mizan and Witness/Q-DAG regressions.

Passing these tests validates deterministic software behavior only; it is not a claim of exhaustive moral knowledge.
