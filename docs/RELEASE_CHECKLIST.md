# Cosmic Engine Release Checklist

A release candidate is ready only when all gates are green.

- [ ] Coding standard
- [ ] Application TypeScript typecheck
- [ ] Engine TypeScript typecheck (`npm run typecheck:engine`)
- [ ] Dependency review
- [ ] npm audit
- [ ] CodeQL
- [ ] Release identity
- [ ] API build
- [ ] CAB build
- [ ] TSE regression/gold tests (`npm run test:tse`)
- [ ] Core regression tests
- [ ] API contracts (only if the optional host is released)
- [ ] PostgreSQL certification
- [ ] Final certification
- [ ] No unresolved high-severity CI annotations

## Engine release boundary

The release artifact is the engine surface under `packages/tse-engine` and
`packages/cosmic-engine`. `apps/api`, UI/platform workflows, authentication,
database persistence, ledgers, and domain applications are host integrations,
not part of the Cosmic engine release gate.

The release must preserve these invariants:

- astronomical facts are deterministic and activity-neutral;
- unsupported events are explicit `UNRESOLVED` values;
- hypothesis signals never change the base temporal score;
- provenance records provider, algorithm, convention, timezone, and quality;
- analytical scores are never presented as divine reward, punishment, or final judgement.

Do not merge a release candidate with a known failing mandatory gate.
