# MoonWitness OS v4.25.0 — Native Revelation Binding

## Summary

v4.25 replaces manual action→verse normative grounding with runtime Revelation retrieval. The existing language/action registry is retained only as a non-normative parsing and engineering-magnitude bridge.

## Added

- `src/revelation/binding/` Native Revelation Binder.
- `data/revelation/language-concept-anchors.json` with no verse references, moral direction, or moral score.
- focus-aware Qur'an passage-direction analysis to avoid confusing commands about sanctions/consequences with the moral direction of the underlying action.
- strict four-book corroboration query integration; witness channels remain confidence-only.
- `revelationAlignmentScore` separated from the compatibility `analyticalScore`.
- `REVELATION-INDEX::NATIVE-BINDING` tied to corpus fingerprint + language-profile SHA-256.
- native-binding unit tests and v4.25 API tests.

## Removed from normative direction

- action→verse mapping;
- action-table moral direction fallback;
- witness majority/voting semantics.

The action semantic registry still contains engineering vectors/harm-benefit magnitudes for downstream compatibility scoring. It has zero normative authority and is not represented as pure Revelation.

## Behavioral result

The canonical 10-case matrix passes 10/10. Nine cases derive conditional normative direction through Native Revelation Binding; smoking remains safely unresolved because no allowed empirical bridge is present.

## Deployment boundary

File-driver install and reopen verification pass. Live PostgreSQL execution remains a deployment certification item because no target PostgreSQL service is available in the build environment.
