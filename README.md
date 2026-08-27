# Cosmic Engine

Cosmic is an engine/API-first research runtime for deterministic temporal
astronomy, semantic event interpretation, evidence-aware Mizan analysis, and
bounded AI explanation. It has no frontend application and is intended to be
embedded by a host such as Moonwitness.

## Release surface

The supported engine surface is:

- `packages/tse-engine` — provider-neutral temporal facts, hypotheses, and
  scoring;
- `packages/cosmic-engine` — a host-neutral facade for temporal state,
  candidate-only semantic observation, Mizan projection, and explanation;
- `data/` and `tests/` — versioned runtime profiles and regression evidence.

`apps/api` and the legacy domain folders remain compatibility/integration code.
They are not required by the engine facade and are not part of the embedded
engine release artifact.

## Verification

```text
npm run test:tse
npm run typecheck:engine
npm run release:check
```

See [`docs/README.md`](docs/README.md) for documentation and
[`docs/RELEASE_CHECKLIST.md`](docs/RELEASE_CHECKLIST.md) for the release gate.
