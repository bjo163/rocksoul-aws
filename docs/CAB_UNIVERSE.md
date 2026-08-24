# CAB Universe Observatory

The CAB Observatory is the first UI projection of the canonical Universe read model.

It is intentionally **not** a second semantic engine and does not add a specialized API family.

## Projection layers

```text
Entity / Relation / Event / Evidence / Case
                    ↓
          Revelation / Evidence graph
                    ↓
          CAB Universe read model
                    ↓
             Observatory UI
```

## Surface layout

### World State

Shows observed entity/relation/event counts, integrity status, and recent audit events.

### Revelation Graph

Shows canonical Revelation nodes and their epistemic lanes:

- `CORE`
- `DERIVED`
- `UNRESOLVED`

The UI does not change those lanes.

### Evidence & Provenance

Shows admitted evidence records using the existing Evidence contract. Evidence is presented with its status, reference and source type; the UI does not promote confidence into truth.

### Prophet Profiles

Profiles are projected from the canonical `REVELATION.PROPHET_PROFILE` entity type. Scripture-grounded metadata remains separate from derived or unresolved information.

### J5 — Event → Passage

Selecting a prophetic event opens a detail panel with the event's Prophet, evidence class, grounding, linked graph relations, and explicit Qur'an passage references. When references are absent the UI says that the event remains unresolved. The UI never invents a passage or infers chronology.

### J6 — Review / Witness / Audit rail

The Observatory combines existing review, Witness status, and operational ledger data:

```text
Review → Witness integrity → Audit trail
```

Review remains human-governed. Witness describes integrity and ordering of committed data, not factual truth or Divine acceptance. Audit remains an operational trail.

## Current adapter boundary

The Observatory uses existing `kernelGraph`, `kernelIntegrity`, `kernelLedger`, `witness/status`, `reviews`, and Entity reads for Prophet/Event/Evidence datasets. No `/universe`, `/revelation-graph`, or `/evidence-graph` API family is introduced.

## Governance boundary

CAB may display semantic state, evidence, provenance, review, Witness, and audit information. It cannot issue a Divine verdict, mutate Revelation grounding, or silently collapse `CORE`, `DERIVED`, and `UNRESOLVED`.
