# MoonWitness OS v4.29.0 — Revelation Grammar & Relation Engine

v4.29 adds a structural Qur'an grammar/relation layer beneath Asma, passage direction and the Revelation Moral Graph while preserving the v4.28 single-node Moral Lifecycle baseline.

## Added

- `src/revelation/grammar/` with token morphology candidates and structural relation frames.
- Seeded `data/revelation/grammar-profile.json` (`normativeAuthority=false`).
- `GET /api/v1/revelation/grammar`.
- `REVELATION-INDEX::GRAMMAR`, raising the derived-index install contract from 7 to 8.
- 100-case grammar adversarial suite plus real-corpus grammar regression.

## Relation-quality fixes

The Asma relation miner now consumes grammar frames rather than its former direct token-neighbor parser. Negation is retained through the relation layer:

- `DOES_NOT_COMMAND`
- `DOES_NOT_FORGIVE`
- `DOES_NOT_GUIDE`

Q4:48 also demonstrates coordinated-predicate preservation: the negated forgiveness clause and the following affirmative forgiveness clause remain separate relations rather than cancelling or overwriting one another.

## Boundaries

- Qur'an remains primary/Muhaimin for grammar-derived normative structures.
- Tawrat, Zabur and Injil remain equal textual-witness corroboration channels and do not outvote Qur'an grammar.
- `rootCandidate` is an engineering surface heuristic; `canonicalRoot` remains null.
- No external Arabic lexicon, tafsir, hadith or 99-name list is introduced.
- Grammar is non-normative and cannot create a moral verdict by itself.

## Regression status

The 10-case Revelation baseline remains 10/10 with 9/10 native Revelation-derived directions; smoking remains deliberately unresolved. Event 100/100, Moral Lifecycle 100/100, semantic/Mizan, Witness/Q-DAG, API build, contracts, preflight, final certification and clean install/reopen remain passing.
