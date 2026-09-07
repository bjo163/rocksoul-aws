## Release promotion

- Source branch: `dev`
- Target branch: `main`
- Dev commit / SHA:
- Release scope:

## Required validation

- [ ] This PR is exactly `dev → main`
- [ ] `dev` AWS Legal Corpus gate is green
- [ ] `dev` full AWS CI/certification is green or any infrastructure blocker is explicitly documented
- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] Relevant tests/builds passed
- [ ] `npm run aws:check` when AWS legal/runtime surfaces changed

## Risk / compatibility

- [ ] Security impact reviewed
- [ ] Data/persistence migration impact reviewed
- [ ] API compatibility impact reviewed
- [ ] Legal research provenance/review boundaries preserved
- [ ] Deferred scope is documented

## Release rule

No release/feature/hotfix remote branch may be created for this promotion. `main` receives only verified state from `dev`.
