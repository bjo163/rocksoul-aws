# MoonWitness OS — Release Status 4.33.0

**Date:** 2026-08-24  
**Release line:** 4.33.x  
**Current posture:** release-candidate hardening / CI certification in progress

## Stable semantic spine

```text
Entity / Relation / Event / Evidence / Case
                    ↓
          Revelation / Knowledge Graph
                    ↓
           Universe Read Model
                    ↓
                  CAB
                    ↓
        Review → Witness → Audit
```

## Release gates

| Gate | State | Requirement |
|---|---|---|
| Release identity | 🟢 | Workspace release line is 4.33.0. |
| PostgreSQL integration | 🟢 | Latest recorded integration evidence passed. |
| API build | 🟡 | Fresh exact-head CI evidence required after latest changes. |
| Full build/test/certification | 🟡 | Fresh exact-head run required. |
| Package migration | 🟡 | Remaining `src/revelation` compatibility/physical migration is still tracked. |
| Lockfile | 🟡 | Canonical lockfile must be validated with `npm ci` from the exact workspace manifests. |
| Security checks | 🟡 | Fresh CodeQL and dependency-review/audit evidence required. |
| Docker release image | 🟡 | Production image build must pass on the exact PR head. |
| N1–N6 environment certification | 🟡 | Target-environment evidence is still required. |
| Production release | 🔴 | Do not tag/publish until all required gates are green. |

## Release hygiene

The release surface must contain only durable product and engineering infrastructure. Temporary lockfile-repair/bootstrap automation has been removed after the lockfile repair phase. Redundant maintenance, changelog, project-label automation, and documentation deployment workflows are not part of the release gate.

## Scope policy

The MoonWitness Control Plane implementation and its required contracts/tests remain in scope. Repository-wide automation is retained only when it directly supports build, security, certification, documentation validation, release, or operational governance. Product functionality must not be deleted merely to reduce PR size.

## Certification rule

`implemented` means source/test/docs contract exists.  
`certification pending` means CI or environment evidence is still outstanding.  
`certified` requires automated suite success plus required target-environment evidence.

For main release evidence, the record must include the **complete full-certification result for that exact commit** under review. Historical or partial results are not sufficient evidence for release promotion.

No production tag should be created while any required release gate is red, pending, or inferred only from historical CI.

## Epistemic boundary

`CORE`, `DERIVED`, and `UNRESOLVED` remain distinct. Revelation provenance, corroboration, observation, inference, AI output, Review, Witness, and Audit are represented as different semantic/governance layers. A Witness commitment proves integrity/ordering of the committed record, not factual truth or Divine acceptance.
