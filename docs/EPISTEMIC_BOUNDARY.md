# L5 — Epistemic Boundary Contract

L5 applies the L0 ontology across Revelation, Knowledge, Evidence, Universe projection, and CAB presentation.

## Two dimensions

`epistemicLane` answers how grounded a record is; `sourceClass` answers where the record came from.

```text
CORE
  allowed source classes: REVELATION, SCRIPTURAL_METADATA

DERIVED
  typical source classes: HISTORICAL_REPORT, TEXTUAL_WITNESS, OBSERVATION, INFERENCE, AI_OUTPUT

UNRESOLVED
  used when grounding is incomplete or contradictory
```

## Promotion rules

- Derived, observed, inferred, AI, or historical material must not be silently promoted to `CORE`.
- `UNRESOLVED` must remain visible even when confidence is high.
- A profile with no explicit grounding is `UNRESOLVED`, not `CORE`.
- A mixed profile containing unresolved context remains `UNRESOLVED`.
- Source class and lane must remain independently inspectable in CAB.

## CAB display rule

Observable state is rendered as a lane/source pair, for example:

```text
CORE · REVELATION
DERIVED · INFERENCE
UNRESOLVED · REVELATION
```

CAB may summarize these states but may not turn them into a factual or Divine verdict.
