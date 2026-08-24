# MoonWitness OS — Master Roadmap TODO

Last refresh: 2026-08-24  
Release line: **4.33.0**

This is the active execution roadmap. Historical/full-audit material remains in `docs/TODO.md`; current release status is in `docs/RELEASE_STATUS_4.33.0.md`.

## Status
- [x] = complete and certified
- [~] = implemented, certification or environment evidence pending
- [ ] = planned

## F — CAB Certification
- [x] Canonical CAB menus and governed navigation
- [x] Case Workflow human gate
- [x] Evidence / Review / Witness / Audit UI contracts
- [x] CAB visual and authentication contracts
- [x] PostgreSQL certification lane
- [~] Full CI certification baseline — re-run required after latest API/CI fixes

## G — Canonical Package Architecture
- [x] Canonical Revelation seed ownership in `packages/revelation/data`
- [x] Legacy root Prophet seed copies removed
- [x] Persistence bootstrap aligned with package ownership
- [x] Preflight legacy-seed rule aligned
- [x] Package ownership regression test
- [x] Package standard updated
- [~] Cut remaining package → `src/revelation` compatibility dependency
- [~] Finish physical migration of remaining `src/revelation` implementation

## H — Revelation Semantic Graph
- [x] H1 Scripture Reference normalizer
- [x] H2 Prophetic Event normalizer
- [x] H3 Pure Revelation Graph builder
- [x] H4 Determinism and negative graph constraints
- [~] Final re-certification of H lineage after I changes

## I — Evidence & Provenance
- [x] I1 Evidence / Provenance semantic normalizer
- [~] I2 Evidence ↔ Revelation Graph bindings
- [~] I3 Evidence ↔ Prophet / Event / Passage relations
- [~] I4 Corroboration / conflict graph
- [~] I5 Immutable supersession/history projection
- [~] I6 Evidence-driven re-analysis lifecycle

## J — CAB Universe Projection
- [~] J1 Canonical Universe read model
- [~] J2 Revelation Graph panel
- [~] J3 Evidence / Provenance panel
- [~] J4 Prophet Profile drill-down
- [~] J5 Event → Passage drill-down
- [~] J6 Review / Witness / Audit rail
- [~] J7 Explicit uncertainty / empty-state UX

## K — API / Entity Boundary
- [~] K1 Existing endpoint inventory
- [~] K2 Revelation Graph → Entity / Relation mapping
- [~] K3 Duplicate API prevention
- [~] K4 CAB/Universe runtime validation
- [~] K5 Compatibility regression suite
- [x] API route-result contract hardened against unsafe response spreads
- [x] Production API response typing regression fixed for TS2698 failure

## L0 — Knowledge Ontology Freeze
- [~] Canonical node kinds
- [~] Source class vs epistemic lane
- [~] Canonical relation vocabulary
- [~] Prophet-as-context rule
- [~] Event-as-operational-subject rule
- [~] Negative boundaries / projection rule

## L — Knowledge / Profiles
- [~] L1 Prophet Profile
- [~] L2 Scripture Reference profile
- [~] L3 Prophetic Event profile
- [~] L4 Source-grounded People / Place relations
- [~] L5 Derived vs Unresolved segregation
- [~] L6 Knowledge Provenance Explorer

## M — CAB Visualization
- [~] M1 Universe graph layout
- [~] M2 Node/relation lane visualization
- [~] M3 Evidence state visualization
- [~] M4 Witness / Audit visualization
- [~] M5 Keyboard/accessibility navigation
- [~] M6 Localization parity
- [~] M7 Visual certification contracts

## N — Production Certification
- [~] N1 Concurrency / failure certification contract
- [~] N2 PostgreSQL retention / PITR certification contract
- [~] N3 Distributed rate-limit certification contract
- [~] N4 Managed key custody / rotation certification contract
- [~] N5 Deployment security certification contract
- [~] N6 CAB / XRP / Flow separate certification contract

## Release housekeeping
- [~] Release metadata aligned to 4.33.0
- [ ] Regenerate `package-lock.json` from the 4.33.0 workspace manifests using the repository package manager.
- [ ] Run fresh full CI on the final 4.33.0 head.
- [ ] Resolve all CI annotations/errors/warnings that are actionable release blockers.
- [ ] Run target-environment N1–N6 drills.
- [ ] Publish machine-readable certification artifacts.
- [ ] Create the 4.33.0 tag only after all required gates are green.

## Rules
- Code, tests, and docs update together.
- Do not create a new API family when existing Entity/Relation/Event/Evidence/Case contracts can express the feature.
- Canonical data belongs to exactly one owning package.
- Runtime filesystem/database access stays in adapters.
- `CORE`, `DERIVED`, and `UNRESOLVED` remain distinct.
- Explicit revelation, corroboration, observation, inference, and AI output remain distinguishable.
- CAB is a projection, not a second semantic engine.
- Operational certification must not be inferred from static contracts alone.
