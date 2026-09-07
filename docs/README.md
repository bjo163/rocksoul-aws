# AWS — Canonical Documentation

## ANGEL WITH SHOTGUN

AWS is the **International Law & Regulation Intelligence** domain of MoonWitness / Rocksoul Research.

Its canonical question is:

> **Was it allowed?**

## Repository governance

- [BRANCHING.md](BRANCHING.md) — canonical remote model: `main` stable/release, `dev` all development.
- [../CONTRIBUTING.md](../CONTRIBUTING.md) — coding, validation, and promotion rules.

## Read in this order

1. [../README.md](../README.md) — identity, scope, and golden separation.
2. [LEGAL_RESEARCH_MODEL.md](LEGAL_RESEARCH_MODEL.md) — legal source, authority, provenance, uncertainty, and analysis model.
3. [ROCKSOUL_INTEROP.md](ROCKSOUL_INTEROP.md) — STORY / EVENT / PERSON / RGBL / AWS ownership boundaries.
4. [AUTOMATION.md](AUTOMATION.md) — automatic research, freshness, supersession, and re-analysis.
5. [schemas](../schemas) — machine-readable domain contracts.

## Canonical AWS boundary

```text
LEGAL TEXT
!= APPLICABLE LAW
!= FACT
!= ARGUMENT
!= LEGAL OUTCOME
!= MIZAN ASSESSMENT
```

AWS may use inherited MoonWitness/Cosmic infrastructure where useful, but inherited Cosmic documents do not override these AWS domain contracts.

## Historical / inherited documentation

Many files in this repository still describe the repository's earlier Cosmic engine identity. Until migrated or retired, treat them as **technical history / implementation substrate**, not as the canonical product/domain definition of AWS.

The migration must preserve useful capabilities while removing stale domain ownership safely through reviewed changes.


## Phase-1 executable proof

- [AWS canonical legal data](../data/aws/README.md)
- [Jerusalem 70 CE — five-domain legal boundary proof](cases/JERUSALEM-70-FIVE-WAY.md)
- [Phase-1 implementation issue #103](https://github.com/bjo163/rocksoul-aws/issues/103)

The first executable proof intentionally produces `NOT_APPLICABLE → UNRESOLVED` for Geneva Convention IV against a 70 CE event. This verifies non-anachronism and the rule that a non-applicable legal basis does not imply permission.


## Phase-2 runtime

- [AWS Phase-2 persistence & source worker](AWS-PHASE-2-RUNTIME.md)
- Phase-2 implementation issue #105

The runtime persists legal-domain state through the shared persistence abstraction and queues only affected cases when verified source payloads change.


## Phase-3 official sources

- [ICRC + UNTC official source adapters](AWS-PHASE-3-OFFICIAL-SOURCES.md)
- Implementation tracking: issue #109

Phase 3A connects verified official-source snapshots to the Phase-2 persistence/re-analysis runtime while keeping source changes separate from legal verdicts.
