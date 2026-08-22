# MoonWitness / Universe OS v4.20.0 — Qur'anic Epistemic Mizan

## Scope

v4.20 deepens the single-node Mizan semantic layer. It does not add a second witness node or network consensus.

## Added

- `data/mizan/quranic-principles.json`
- `src/engines/quranic-mizan.ts`
- four Qur'anic analytical statuses: `ESTABLISHED`, `PROVISIONAL`, `INSUFFICIENT_EVIDENCE`, `RESERVED`
- explicit report verification state
- explicit heart-knowledge boundary
- action-specific `quranGrounding` coverage (`DIRECT`, `MIXED`, `INDIRECT`, `NONE`)
- cautious coercion/mistake/capacity responsibility context
- Qur'anic reference integrity test against the bundled Qur'an corpus
- UI Qur'anic Mizan status/grounding panel
- updated 9 Action Gate semantics

## Corrected

- Action Gates are no longer signed moral-risk weights.
- Gate values are now 0..1 epistemic/context signals.
- Numeric Mizan scores are explicitly secondary engineering heuristics.
- Unverified accusations no longer look like established findings.
- Smoking is explicitly marked as indirect Qur'anic grounding; no fabricated direct smoking verse is claimed.
- Family/ancestry/transmitted context is not inherited guilt.
- Final destination/true-heart claims are `RESERVED`.

## Qur'an-first invariants

- Q49:6 — verify reports before harmful reliance.
- Q17:36 — do not turn unsupported inference into knowledge.
- Q4:135 / Q5:8 — preserve justice against self-interest and hostility.
- Q33:5 / Q2:225 — distinguish mistake and intentionality while not claiming heart access.
- Q6:152 / Q2:286 — account for capacity.
- Q6:164 — do not transfer one person's burden to another.
- Q55:7-9 / Q57:25 — balance/qist is the normative design target.
- Q21:47 / Q53:32 — actual final weighing and true righteousness remain outside software.

## Compatibility

The existing numeric Mizan fields remain for downstream compatibility. New consumers should prefer `quranicMizan.status` / `mizan.quranic.status` as the primary assertion level.

## Verification boundary

The release claims software behavior and reference integrity, not theological infallibility. The mapping from verses to software principles is documented interpretation/engineering and remains auditable and revisable.

## Good-deed symmetry correction

- Added positive semantic profiles for charity, helping, restitution, fair dealing, protection of life, and claim verification.
- Added Q99:7-8 as a bidirectional deed-granularity invariant: both good and harm remain represented.
- Context magnitude no longer manufactures `risk` when no harmful semantic/impact signal exists.
- Epistemic uncertainty is kept separate from moral/accountability risk.
- Restitution matching was made more specific so returning an item to its owner is not collapsed into generic helping/theft context.
- Defamation now carries explicit dignity/truth/trust harm instead of a neutral harm vector.

## Separate benefit/harm channels

`quranicMizan.balance` now exposes `harmSignal` and `benefitSignal` independently, with `retainBothChannels=true` and `engineeringNetIsDivineCancellationRule=false`. Legacy net/XP fields are retained for compatibility only.
