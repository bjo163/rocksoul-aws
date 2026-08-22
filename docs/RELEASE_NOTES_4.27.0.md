# MoonWitness OS v4.27.0 — Semantic Event Interpreter

v4.27 moves event understanding in front of Revelation binding. The release keeps the v4.26 four-book, Asma, Native Binding, RGBL/OUT scoring and single-node Witness foundations, while replacing the previous one-label-first interpretation with an auditable multi-event graph.

## Added

- `src/events/` Event Graph subsystem.
- non-normative `data/events/event-language-profile.json`.
- parsing for sequence, negation, reported claims, knowledge state, mistake, coercion, permission, capacity, actor/patient/object/owner clues and restoration.
- event-by-event Revelation binding.
- explicit `PRINCIPLE_CONFLICT` and `VIOLATION_WITH_RESTORATION` states.
- separate historical-violation and restoration lifecycle channels.
- event-level responsibility context for analytical Mizan.
- `REVELATION-INDEX::EVENT-INTERPRETER` seed/install fingerprint.
- binder/corroboration caches keyed to runtime revision for deterministic repeat analysis.
- canonical 100-case adversarial Event/Mizan suite.

## Correctness changes

- negated actions no longer fall back to legacy action binding.
- reported embedded actions no longer become established actions of the reported subject.
- `dituduh mencuri tanpa bukti` analyzes unsupported accusation rather than treating the accused as a confirmed thief.
- generic property-taking with explicit permission no longer becomes theft.
- mistake-context generic property-taking can be invalidated as a theft label.
- `theft → restitution` is retained as two events instead of collapsing into one label.
- same-event positive/negative Revelation relations remain an explicit conflict rather than a net arithmetic verdict.
- four-book corroboration now uses Revelation binding query phrases rather than arbitrary user-text tokens, reducing lexical false-positive boost.

## Boundaries

The Event Interpreter is an engineering language/epistemic layer and has `normativeAuthority=false`. It cannot create Revelation references or moral direction. Numeric responsibility attenuation remains software analysis, not revealed weighting. The system still does not compute final divine judgement, hidden heart truth, or afterlife destination.

## Certification

- canonical 10-case Revelation matrix: 10/10 expected directions; 9/10 native Revelation-derived, smoking intentionally unresolved.
- adversarial event matrix: 100/100.
- typed Revelation corpus: 18,328 passages.
- six derived Revelation indexes verified.
- semantic/Mizan regression: pass.
- Witness/Q-DAG regression: pass.
- API TypeScript build: pass.
- clean file-driver install → reopen → Revelation verification: pass.

Live PostgreSQL execution remains deployment-specific and is not claimed by the build environment used for this release.
