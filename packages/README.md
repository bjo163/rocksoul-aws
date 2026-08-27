# MoonWitness Packages

Packages are platform boundaries, not arbitrary folders.

Current workspace packages:

| Package | Owns | Status |
|---|---|---|
| `@moonwitness/contracts` | shared wire/domain contracts | stable |
| `@moonwitness/kernel` | universal domain/runtime boundary | facade migration |
| `@moonwitness/revelation` | Revelation/Knowledge semantic boundary | facade migration |
| `@moonwitness/persistence` | storage/providers/repositories | stable |
| `@moonwitness/data-access` | actor-aware data access | stable |
| `@moonwitness/sdk` | API/client contracts | stable |

See [`docs/PACKAGE_STANDARD.md`](../docs/PACKAGE_STANDARD.md) before creating a new package.

## Rule of thumb

Create a package only when the capability has a clear owner, stable public API, bounded dependencies, independent tests, and reuse/platform value. Otherwise keep it as an internal module.
