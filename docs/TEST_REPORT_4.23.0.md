# Test Report — v4.23.0

## Four-book corpus

- Quran: 6,236 local Arabic ayahs — PASS.
- Tawrat textual witness: 5,852 records — PASS.
- Zabur textual witness: 2,461 records — PASS.
- Injil textual witness: 3,779 records — PASS.
- equal witness channel weights — PASS.
- witness cannot create moral direction — PASS.
- witness cannot reverse Quran direction — PASS.
- missing/index-only witness text contributes zero — PASS.
- real bundled witness retrieval can produce confidence-only corroboration — PASS.

## Ten real cases

All factual/person-level results remain `PROVISIONAL` without verified evidence. The direction column answers the separate conditional question: *if the described action is accurate, what analytical moral direction is currently supported?*

| Case | Detected action | Quran coverage | Direction | Revelation status | Score |
|---|---|---|---|---|---:|
| RC01 bribe for permit | CORRUPTION | DIRECT | NEGATIVE | scripture directive verified; binding transitional | -28 |
| RC02 embezzle office funds | CORRUPTION | DIRECT | NEGATIVE | scripture directive verified; binding transitional | -28 |
| RC03 return found wallet | RESTITUTION | MIXED | POSITIVE | explicit Revelation Moral Graph relation | +31 |
| RC04 intentional lie to customer | LYING | DIRECT | NEGATIVE | scripture directive verified; binding transitional | -22 |
| RC05 accuse neighbor without evidence | DEFAMATION | MIXED | NEGATIVE | scripture directive verified; binding transitional | -11 |
| RC06 verify source before sharing | VERIFY_CLAIM | DIRECT | POSITIVE | scripture directive verified; binding transitional | +35 |
| RC07 public budget for private expense | CORRUPTION | DIRECT | NEGATIVE | scripture directive verified; binding transitional | -27 |
| RC08 recurring smoking | SMOKING | INDIRECT | UNRESOLVED | missing allowed empirical bridge | null |
| RC09 help friend study without payment | HELPING_GOOD | DIRECT | POSITIVE | scripture directive verified; binding transitional | +34 |
| RC10 take and keep another's property | THEFT | DIRECT | NEGATIVE | scripture directive verified; binding transitional | -24 |

## Interpretation

The expected direction test passes 10/10, but this is **not** equivalent to “10/10 pure Revelation interpretation.” RC03 obtains a direct explicit Divine-relation grounding. Most other cases have scripture directive structure verified on real Quran passages, while the action-to-passage semantic binding still uses the non-normative language bridge. RC08 intentionally remains unresolved because the four-book-only core is not allowed to invent external medical facts.

The numerical score is analytical software output. Its sign is constrained by the Revelation scorecard, while magnitude still uses engineering impact signals. `scoreComposition.pureRevelationScore=false` makes this explicit.
