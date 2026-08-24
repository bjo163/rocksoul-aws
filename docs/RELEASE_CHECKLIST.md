# Release Checklist

A release candidate is ready only when all gates are green.

- [ ] Coding standard
- [ ] TypeScript typecheck
- [ ] Dependency review
- [ ] npm audit
- [ ] CodeQL
- [ ] Release identity
- [ ] API build
- [ ] CAB build
- [ ] Web build
- [ ] XRP build
- [ ] Flow build
- [ ] Core regression tests
- [ ] API/CAB/Web contracts
- [ ] PostgreSQL certification
- [ ] Final certification
- [ ] No unresolved high-severity CI annotations

Do not merge a release candidate with a known failing mandatory gate.
