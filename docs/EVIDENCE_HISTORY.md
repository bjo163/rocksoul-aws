# Immutable Evidence History — I5

Evidence is append-only at the semantic projection layer. A newer record may supersede an older record, but the older record remains addressable in history.

## Contract

```text
EVIDENCE v1
   ↓ supersedes
EVIDENCE v2
   ↓ supersedes
EVIDENCE v3
```

Each historical entry carries:
- stable `evidenceId`
- `entityId`
- positive `version`
- current status
- `supersedes` / `supersededBy` references when known
- explicit supersession reason when supplied
- original creation timestamp when supplied
- `immutable: true`

I5 is a read/projection contract. It does not create a second persistence API and does not delete, mutate, or promote evidence.

Self-supersession and fabricated records are rejected/ignored. Ordering is deterministic by immutable history ID.
