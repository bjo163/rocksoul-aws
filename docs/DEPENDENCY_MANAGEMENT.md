# Dependency Management

## Policy

Cosmic uses npm workspaces. Dependency changes must be reproducible and reviewable.

- Root and application manifests are the source declarations.
- `package-lock.json` must represent the complete workspace dependency graph.
- CI must use `npm ci` once the lockfile is regenerated and verified.
- Dependabot handles routine update proposals.
- Dependency Review blocks high-severity dependency changes.
- Scheduled `npm audit` checks production dependencies.
- Manual lockfile edits are prohibited unless the resulting tree is generated and verified by npm.

## Current migration gate

The repository currently contains a v3 root lockfile whose package map only contains the root workspace entry. Application manifests contain additional dependencies, so the lockfile must be regenerated with npm before `npm ci` can safely become the certification installer.

Until that regeneration is performed in an environment with the repository's full workspace dependency graph available, CI should not claim reproducible installation.

## Required verification

After regeneration:

```bash
npm install
npm ci
npm run lint
npm run typecheck
npm run release:check
```

The generated lockfile must be committed together with the dependency manifest changes.
