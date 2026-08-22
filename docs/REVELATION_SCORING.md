# Revelation-Grounded Scoring

Version: **4.28.0**

## Purpose

The core keeps numerical Mizan output, but v4.26 removes action-specific manual magnitude from the normative analysis path. Moral direction must already be established by Native Revelation Binding. Scoring cannot invent direction.

## Pipeline

```text
language adapter (non-normative)
  -> native Revelation binding
  -> retrieved Qur'an passages
  -> directive / consequence / Moral Graph evidence
  -> Revelation magnitude signals
  -> RGBL + local 13 OUT relevance
  -> Mizan analytical formula
```

## Magnitude inputs

`src/revelation/scoring/revelation-magnitude.ts` uses only structural inputs attached to retrieved Revelation passages:

- native binding confidence;
- explicit directive/consequence marker strength;
- explicit Revelation Moral Graph support;
- repeated independent retrieved references;
- grounding coverage.

The mathematical weights are engineering and live in `data/revelation/scoring-profile.json`. That profile has `normativeAuthority=false`.

## RGBL contract

- **R** — violation/harm direction. Negative values only in the canonical core path.
- **G** — constructive/beneficial direction. Positive values only.
- **B** — epistemic grounding. It may change uncertainty/confidence but never creates moral benefit.
- **L** — restoration/repair. Positive restoration remains a distinct event/channel and never numerically deletes a prior violation from history.

## 13 OUT

The 13 OUT axes remain an engineering topology, not a claim that Revelation enumerates exactly thirteen impacts. Each axis includes non-normative Arabic query anchors in `data/semantic/registry.json`.

An OUT value is populated only when an anchor occurs inside a **local clause window around the matched action passage**, not anywhere in the full ayah. This was added after testing exposed false associations from unrelated clauses.

## Two scores

`revelationAlignmentScore` measures software confidence in the Revelation-derived direction.

`analyticalScore` uses a software magnitude formula whose inputs are Revelation-grounded structural signals.

Neither is a divine sin/reward quantity, and neither is computed when the direction is unresolved.

## Installation integrity

The installer creates `REVELATION-INDEX::SCORING`. Its SHA binds the semantic OUT registry plus the scoring profile. `npm run revelation:install-verify` checks it after reopening persistence.

## Boundary

The current system can correctly say that a score was *derived from Revelation-grounded evidence through a versioned engineering formula*. It cannot say that the number itself was revealed by Allah or equals the actual Mizan of the Hereafter.

## Event graph interaction (v4.27)

For a single resolved event, the existing Revelation magnitude and 13 OUT signals are retained unchanged. For multiple events, the Event Interpreter preserves the strongest negative channel, strongest constructive channel, epistemic grounding, and explicit restoration channel separately. It does not cancel a historical violation with a later repair. Aggregate `MIXED` / `PRINCIPLE_CONFLICT` states do not receive a forced single Revelation alignment score.
