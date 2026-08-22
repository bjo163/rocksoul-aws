# Qur'anic Mizan Analytical Protocol — v4.27 compatibility layer

## Purpose

This protocol makes the software's Mizan analysis more faithful to Qur'anic epistemic and justice principles **without claiming that software reproduces Allah's judgment**.

The Qur'an is the normative core. The software may:

- classify observable/reported actions;
- assess evidence quality and verification state;
- infer possible intention/context with explicit uncertainty;
- analyze impact, causality, repair, capacity, and responsibility context;
- attach Qur'anic references to the relevant normative principle;
- keep an auditable trace of how an analytical result was reached.

The software may **not** claim to know the heart, actual taqwa, Allah's acceptance, the true unseen weighing, or a person's final destination.

## Core pipeline

```text
REPORT / OBSERVATION
        ↓
TABAYYUN — verification state
        ↓
'ILM BOUNDARY — what is known vs inferred
        ↓
QIST — bias-resistant justice
        ↓
ACTION / DEED
        ↓
INTENTION SIGNAL — declared/inferred/mistake/coercion
        ↓
CAPACITY + RESPONSIBILITY CONTEXT
        ↓
13 IMPACT CHANNELS
        ↓
MIZAN / BALANCE
        ↓
QUR'ANIC STATUS
        ├─ ESTABLISHED
        ├─ PROVISIONAL
        ├─ INSUFFICIENT_EVIDENCE
        └─ RESERVED
```

## The four decision statuses

### ESTABLISHED

A software finding can be `ESTABLISHED` only when the factual action is supported by verified evidence, the semantic classification is sufficiently strong, the Qur'anic grounding is direct/mixed, and no actual conflict remains.

`ESTABLISHED` means **established for the software's analytical record**, not divinely established guilt, sin, faith, or final destiny.

### PROVISIONAL

The action is recognizable and has a relevant Qur'anic grounding, but the factual report is not independently verified or another important uncertainty remains.

Canonical language:

> Assessment is conditional on the described facts being accurate and should not be used to harm a person without verification.

### INSUFFICIENT_EVIDENCE

The action is unresolved, semantic confidence is too low, or no relevant action-specific Qur'anic grounding is registered.

The engine must not manufacture a conclusion simply to produce an answer.

### RESERVED

The requested claim belongs to a domain the software must not decide, including:

- the real content of another person's heart;
- actual taqwa/inner righteousness;
- Allah's acceptance or rejection;
- the actual divine Mizan of the Hereafter;
- Jannah/Jahannam/final destination.

## Qur'anic principles registry

Canonical machine-readable source:

`data/mizan/quranic-principles.json`

Current principles:

| ID | Qur'an references | Software role |
|---|---|---|
| `MIZAN_BALANCE` | Q55:7-9, Q57:25 | Balance and qist; do not distort/short-change the measure. |
| `JUSTICE_WITNESS` | Q4:135, Q5:8, Q6:152 | Same standard despite self-interest, kinship, status, or hostility. |
| `VERIFY_REPORTS` | Q49:6 | Verify reports before conclusions that could harm people. |
| `KNOWLEDGE_BOUNDARY` | Q17:36 | Do not promote unsupported inference into knowledge. |
| `INTENT_DISTINCTION` | Q33:5, Q2:225 | Distinguish mistake from deliberate intention while keeping heart-knowledge outside software. |
| `CAPACITY` | Q6:152, Q2:286 | Account for capacity rather than assuming equal ability. |
| `COERCION_CONTEXT` | Q16:106 | Coercion is relevant context; software generalization is explicitly cautious because the verse has a specific context. |
| `INDIVIDUAL_RESPONSIBILITY` | Q6:164 | No inherited/group guilt; context is not transferred burden. |
| `DEED_GRANULARITY` | Q99:7-8 | Do not discard small beneficial/harmful signals merely because they are small. |
| `RECORD_COMPLETENESS` | Q17:13-14, Q18:49 | Preserve traceability and inspectability of the analytical record. |
| `FINAL_JUDGMENT_RESERVED` | Q21:47, Q53:32 | Final divine weighing and true inner righteousness are outside software. |

Every reference in this registry and every action-specific Qur'an reference is tested against the bundled Qur'an corpus at `data/divine-books/quran/ayahs.jsonl`.

## Native Revelation grounding

The normative core no longer reads action-specific Qur'an mappings or action magnitude from `data/registries/action-semantics.json`. A language adapter identifies a candidate action/concept, then `src/revelation/binding/` retrieves Qur'an passages at runtime and derives direction from passage structure and the Revelation Moral Graph.

Important example: `SMOKING` is `INDIRECT`. The Qur'an does not name cigarette smoking. The engine may use general principles such as avoiding destruction/excess, but a concrete health-harm assessment requires empirical evidence. It must never invent a verse that says "smoking" directly.

## 9 Action Gates

The project preserves a 9-gate shape, but v4.20 changes their meaning: they are **epistemic/context channels in the range 0..1**, not signed moral weights.

1. `HEARING`
2. `SIGHT`
3. `TOUCH_BODY`
4. `TASTE`
5. `SMELL`
6. `KNOWLEDGE_REASONING`
7. `INTENTIONALITY`
8. `CONTEXT_INFLUENCE`
9. `INHERITED_TRANSMITTED_CONTEXT`

The first five preserve the project's five-sense implementation convention. The Qur'an explicitly pairs hearing, sight, and fu'ad in Q17:36 and contains separate bodily/taste/smell observations, but it does not present a software taxonomy called "five Action Gates." Therefore the repository labels this shape as an engineering convention, not revealed enumeration.

Gate 9 is especially constrained by Q6:164: ancestry, family, media, tradition, and environment may be analyzed as context, but **burden/guilt is never inherited from another person**.

## Intention model

The engine distinguishes:

- `DECLARED_INTENT_SIGNAL`
- `MISTAKE_SIGNAL`
- `COERCION_SIGNAL`
- `INFERRED`
- `UNKNOWN`

All intention output has:

```text
heartKnown = false
```

A statement such as "I intentionally did X" is evidence of a **declared intention signal**. It is not proof that software has direct access to the heart.

## Responsibility model

Coercion, mistake, and limited capacity may attenuate the model's analytical accountability score. The attenuation factor is an **engineering heuristic**, not a revealed formula.

`burdenTransferAllowed` is always `false`.

## Numeric scores

Mizan numeric values remain useful for:

- comparison;
- sorting;
- regression testing;
- anomaly detection;
- visualization;
- audit consistency.

They are secondary to the Qur'anic epistemic status.

The Qur'an does not provide the software's 0..100 weights. v4.26 improves provenance by deriving magnitude inputs from retrieved Revelation structure, but the formula and numeric scale remain engineering. Every result therefore carries the boundary:

> Numeric values are software heuristics for comparison/audit; the Qur'an does not supply these software weights.

## Risk vs evidence

v4.20 corrects a previous conceptual problem: Action Gates no longer increase/decrease moral risk merely because a sensory/context signal exists.

- Action Gates contribute epistemic/context information.
- Impact/RGBL/causality contribute analytical harm/benefit modeling.
- Evidence changes how strongly the result may be asserted.
- Responsibility context can attenuate analytical accountability.

High confidence must not itself create higher moral risk.

## Verification invariant

A user-provided narrative is a report to be analyzed, not automatically verified fact.

For a result that could affect a person:

```text
UNVERIFIED REPORT → PROVISIONAL
VERIFIED EVIDENCE + DIRECT GROUNDING → may become ESTABLISHED
```

This invariant is intentionally conservative.

## Final boundary

The engine's strongest allowed statement is still an **analytical statement about supplied/verified facts and Qur'anic principles**.

It never becomes:

```text
"Allah has judged this person ..."
"This person's heart is ..."
"This person will enter ..."
```

Those remain `RESERVED`.

## Good-and-harm symmetry

v4.20 treats beneficial deeds as first-class semantic events, not merely as "absence of harm". Q99:7-8 is used as the design invariant that both small good and small harm must remain visible to the analytical record.

Current positive profiles include `CHARITY`, `HELPING_GOOD`, `RESTITUTION`, `FAIR_TRADE`, `PROTECTION_LIFE`, and `VERIFY_CLAIM`. Their benefit vectors can raise `positiveScore` without manufacturing a harm/accountability score.

Likewise, contextual magnitude (`causality`, time/intensity, domain breadth) may amplify an already detected harm or benefit, but **cannot create moral harm by itself**. Epistemic uncertainty remains a separate field and must not be converted into guilt.

## No revealed netting formula

The primary Qur'anic analytical output keeps `harmSignal` and `benefitSignal` separately visible. Q99:7-8 is used here as a recording/design invariant: both good and harm remain inspectable, including small signals. The repository therefore does **not** treat `positiveScore - accountabilityScore`, `totalXp`, or any other engineering net as a revealed rule saying one deed has divinely cancelled another. Those legacy/net fields exist only for compatibility, comparison, or visualization.


## v4.21 Four-book Revelation Core

Normative reasoning is restricted to Al-Qur'an, Tawrat, Zabur, and Injil, with Al-Qur'an primary/Muhaimin. External research and historical metadata cannot contribute normative weight. The engine distinguishes scripture text from metadata and distinguishes a place mentioned in a passage from the place where that passage was revealed. Tawrat/Zabur/Injil transmitted textual-witness corpora are now bundled and seeded for corroboration only; they are not equated with the original revealed texts and cannot establish or reverse primary moral direction. See `REVELATION_SEMANTIC_CORE.md`.

## v4.22 Asma separation

Qur'anic Mizan no longer receives a 99-Asma catalog or hand-authored Asma semantic profile. The active Asma ontology is discovered separately under `src/revelation/asma/`. Current action aliases/action semantics remain transitional language/engineering bridges; their Asma IDs have been removed. Numeric Mizan values remain downstream engineering scores and never become a revealed unit of reward/punishment.

## v4.23 layered score

`revelationScorecard` now separates Quran grounding/direction from engineering magnitude. `pureRevelationDerived` describes direction provenance; `scoreComposition.pureRevelationScore` is currently `false` because numeric magnitude still uses engineering impact signals. Indirect actions requiring facts outside the admitted four-book corpus return an unresolved Revelation score instead of silently importing external evidence.

## v4.25 native Revelation direction

The Mizan no longer accepts a manual action→verse mapping as normative grounding. A language adapter may recognize the user's language, then `src/revelation/binding/` performs runtime corpus retrieval. Moral direction is admitted only when the retrieved Revelation structure supports it. Engineering action vectors remain downstream magnitude/context signals with zero normative authority.

Two scores are intentionally separate:

- `revelationAlignmentScore`: signed Revelation direction × software grounding/alignment confidence; **not severity of sin/reward**;
- `analyticalScore`: downstream engineering magnitude for comparison/compatibility; not pure Revelation and not divine weighing.


## v4.26 RGBL and 13 OUT roles

- `R`: signed violation/harm direction from Revelation-grounded negative binding.
- `G`: constructive/beneficial alignment from Revelation-grounded positive binding.
- `B`: epistemic/grounding strength only; it is not counted as moral benefit.
- `L`: restoration/repair signal; it does not erase an earlier violation event.

The 13 OUT axes remain analytical lenses rather than a revealed enumeration. In the core path an OUT axis is populated only when its non-normative Arabic query anchors match the local clause window around the action-bound passage. This prevents unrelated text elsewhere in a long ayah from manufacturing impact.

## v4.27 Event Graph boundary

Qur'anic Mizan now receives an event graph before weighing. Negated actions are not treated as occurred; reported claims remain epistemically provisional; permission/mistake can invalidate an inferred action identity; coercion is retained as responsibility context; and violation→restoration is a lifecycle sequence rather than arithmetic cancellation. A same-event positive/negative Revelation conflict sets `ACTUAL_CONFLICT`, preventing an established finding until resolved.

The v4.31 contract also forwards the structured `conflictResolution` record to
both `quranicMizan` and the Revelation scorecard. This makes the safety gate
auditable at the final analytical boundary rather than leaving it only inside
the event interpreter. The adversarial validation suite covers 500 neutral
context variants and requires conflict blocking, no-divine-verdict behavior,
and deterministic event direction/state preservation.

## v4.28 Lifecycle and Light

LIGHT can report restoration/repair progress without cancelling RED historical violation. `moralLifecycle` provides the temporal state needed to distinguish violation-active, cessation, restitution, repair and relapse. Numeric restoration signals remain engineering measurements, not revealed forgiveness units.

## v4.29 Grammar provenance

Mizan may use grammar-derived structural evidence only after exact Qur'an passage retrieval. Grammar confidence does not itself add moral value. Ambiguous condition/root/cause fields remain candidates, and final Divine weighing remains reserved.
