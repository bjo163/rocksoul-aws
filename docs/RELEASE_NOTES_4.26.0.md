# MoonWitness OS v4.26.0 — Revelation-Grounded RGBL/OUT Scoring

## Added

- `src/revelation/scoring/revelation-magnitude.ts`.
- `data/revelation/scoring-profile.json` (`normativeAuthority=false`).
- Revelation-grounded RGBL and 13 OUT generation.
- local-clause OUT relevance to avoid unrelated whole-ayah matches.
- `REVELATION-INDEX::SCORING` install/reopen verification.
- dedicated magnitude regression tests.

## Changed

- core `semantic-engine.ts` no longer imports `action-semantics.json` for vectors, harm, benefit, or impact magnitude.
- `R/G/B/L` roles are explicit: violation, benefit, epistemic grounding, restoration.
- Blue is excluded from positive moral score.
- analytical score magnitude uses Revelation-grounded structural inputs instead of legacy action magnitude.
- seed manifest now contains 101 explicit sources / 18,565 entities; Revelation passages remain 18,328.

## Boundary

The score formula remains engineering. The release does not claim that ±100, RGBL, the 13 OUT enumeration, or any multiplier is a revealed divine weighing unit.
