# Evidence-Driven Re-analysis Lifecycle

MoonWitness treats an analysis as a versioned interpretation of a specific evidence snapshot.

```text
Evidence snapshot
      ↓
fingerprint
      ↓
Analysis version
      ↓
Witness commitment
```

When the current evidence fingerprint differs from the fingerprint used by the last analysis, the case is `REANALYSIS_REQUIRED`. The previous analysis and Witness record remain historical; they are not overwritten.

## States

- `CURRENT`: current evidence matches the evidence snapshot used by the analysis.
- `REANALYSIS_REQUIRED`: evidence changed or no prior analysis exists.
- `UNRESOLVED_INPUT`: an evidence input is unresolved and must not be promoted to a current analytical state.

The lifecycle is deterministic and uses stable ordering of evidence IDs and versions. It is a semantic contract, not a new API family.
