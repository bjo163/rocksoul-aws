# Knowledge Provenance Explorer — L6

The provenance explorer is a pure projection over existing Entity / Relation / Event / Evidence / Case / Review / Witness / Audit records.

## Contract

Protocol:

`CAB_PROVENANCE_TRACE_V1`

Canonical trace:

```text
SOURCE / REFERENCE
        ↓
      EVENT
        ↓
     EVIDENCE
        ↓
     RELATION
        ↓
       CASE
        ↓
      REVIEW
        ↓
     WITNESS
        ↓
      AUDIT
```

The trace is representational. It does not create facts, promote epistemic lanes, or infer missing links.

## Terminal states

- `GROUNDED` — trace has explicit grounded material and no unresolved node.
- `DERIVED` — trace contains derived material but no unresolved node.
- `UNRESOLVED` — at least one unresolved trace node exists.
- `INCOMPLETE` — only the root is available.

## Boundaries

- Missing grounding is rendered as `UNRESOLVED`, never `CORE`.
- Evidence classification remains distinct from source authority.
- Witness represents integrity, not factual or Divine truth.
- Audit represents recorded governance history, not a truth oracle.
- No `/provenance` API is required; the trace is built from existing entity/resource/kernel/review/witness surfaces.
