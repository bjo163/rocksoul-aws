# Contributing to Cosmic

## Before opening a PR

Run:

```bash
npm run lint
npm run typecheck
npm test
```

For release work, also run the applicable build and certification commands.

## Coding rules

- No `@ts-nocheck`.
- No explicit `any` or `as any` escape hatches.
- Prefer explicit interfaces at domain boundaries.
- Use `unknown` for untrusted/dynamic input and narrow it safely.
- Keep commits small and focused.
- Do not bypass failing CI checks without documenting the reason.

## Pull requests

Describe the problem, the change, tests run, and any migration or security impact. Avoid mixing unrelated refactors with functional changes.
