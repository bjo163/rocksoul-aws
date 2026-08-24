# Cosmic Coding Standard

The repository treats coding standards as CI gates, not optional style advice.

## Mandatory rules

- Do not use `@ts-nocheck`.
- Do not use explicit `any` or `as any` as a type escape hatch.
- Prefer `unknown` at untrusted boundaries and validate/narrow before use.
- Keep domain boundaries typed and explicit.
- Do not bypass release or certification gates with source-level exceptions.
- Keep security/audit records deterministic and typed.
- Use small, focused commits for refactors so regressions can be isolated.

## CI gates

Every certification run must execute:

1. `npm run lint`
2. `npm run typecheck`
3. release identity verification
4. application builds
5. regression/contract tests
6. production certification

A coding-standard violation is a build failure. Warnings and annotations must be reviewed rather than ignored.

## Migration policy

Legacy code may be migrated incrementally. Do not add new `@ts-nocheck` or explicit `any` while older files are being hardened. When a boundary genuinely requires dynamic data, use `unknown`, a named interface, or a validator.
