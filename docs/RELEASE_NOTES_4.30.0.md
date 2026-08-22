# Release Notes — 4.30.0

## Follow-up conflict-resolution hardening

The event interpreter now exposes a deterministic `conflictResolution` record.
It distinguishes same-event opposing Revelation bindings from distinct ordered
events such as violation followed by restoration. Same-event conflicts block an
`ESTABLISHED` analytical Mizan result; sequence-separated events remain visible
without arithmetic cancellation. No normative priority is inferred by software.

## v4.31 preparation — Evidence-aware Mizan validation

The structured conflict state is now forwarded into `quranicMizan` and the
Revelation scorecard. A 500-case adversarial suite checks neutral-context
invariance, conflict blocking, evidence-safe status propagation, and the
absence of any divine verdict claim.

## Deep Divine Ontology / Asma Engine

v4.30 adds a corpus-derived Divine Ontology between Revelation Grammar/Asma discovery and the Revelation Moral Graph.

### Added

- `src/revelation/asma/divine-ontology.ts`
- `data/revelation/divine-ontology-profile.json`
- `/api/v1/revelation/divine-ontology`
- `REVELATION-INDEX::DIVINE-ONTOLOGY`
- relation-family polarity preservation
- explicit relation-target concepts
- strict corpus-context clustering
- 100-concept ontology provenance audit

### Changed

- Asma protocol: `PURE_REVELATION_ASMA_V2`
- Moral Graph protocol: `REVELATION_MORAL_GRAPH_V2`
- Revelation Semantic Core version: 4.30.0
- seed manifest: 106 sources / 18,570 entities
- install contract: nine derived Revelation indexes

### Boundaries

The ontology does not restore the historical 99-name catalog. Context clusters cannot create canonical Divine Names or normative authority. Qur'an remains primary/Muhaimin; Tawrat/Zabur/Injil remain corroborative textual witnesses. Final Divine judgement remains non-computable.
