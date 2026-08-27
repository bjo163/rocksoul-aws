# Cosmic Engine Scope

Cosmic is released as an embeddable engine capability. The host owns HTTP,
authentication, persistence, scheduling, user interfaces, and final evidence
authority.

## Stable engine capabilities

1. **Temporal facts** — deterministic Sun/Moon positions, rise/set events,
   night intervals, and explicit unresolved states.
2. **Temporal research** — frozen 45-degree hypothesis definitions, statistical
   result contracts, and sensitivity calculations. These are research signals,
   not revealed rules.
3. **Semantic candidates** — offline registry/event parsing that proposes
   action, entity, claim, and intention candidates. It does not assign host
   authority, verified evidence, or divine judgement.
4. **Analytical projection** — Mizan-compatible temporal context and bounded
   explanation. Numeric values are software metrics only.

## Host integration contract

The host should:

- resolve semantic candidates against its canonical knowledge graph;
- verify evidence and attach source revisions;
- persist runs/results through its own audit and replay runtime;
- expose routes through its own validated protocol layer;
- keep temporal facts separate from domain-level scriptural evidence;
- preserve `UNRESOLVED` and review-required states.

Cosmic must not create a second database, witness ledger, authentication layer,
or API platform inside the host.

## Explicit non-goals

The following are not Cosmic engine responsibilities: UI rendering, user
accounts, authorization, jobs, fiscal/governance workflows, external data
proxying, persistence models, ledger commitments, or automatic decisions about
people.

## Versioning

The release identity is the root version (`4.33.0` at this baseline). Temporal
protocol, scoring profile, hypothesis registry, provider/algorithm versions,
and data revisions must be pinned in provenance before a production tag.
