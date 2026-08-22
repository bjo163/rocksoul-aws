# Revelation Grammar & Relation Engine

Version: **4.29.0**

## Purpose

The grammar layer is a structural parser over the bundled Qur'an corpus. It exists to reduce dependence on lexical adjacency when building Revelation relations. It has **zero normative authority**: moral direction remains a property of Revelation passages and their validated relation structures, not of the grammar profile.

## Current scope

- Qur'an: primary/Muhaimin grammar source.
- Tawrat/Zabur/Injil: textual-witness corroboration channels only; their English/transmitted grammar does not override Qur'an grammar or create standalone moral direction.
- No tafsir, hadith, external Arabic lexicon, morphology database, or human-curated 99-name list is used by this layer.

## Structural frames

`src/revelation/grammar/` currently extracts:

- `DIVINE_PREDICATE`
- `COORDINATED_PREDICATE`
- `PROHIBITION`
- `IMPERATIVE_CANDIDATE`
- `CONDITION_EXPLICIT`
- `CONDITION_CANDIDATE`
- `VOCATIVE`
- `SPEECH`
- `CAUSE_CANDIDATE`
- `PURPOSE_RESULT_CANDIDATE`

Each frame retains ayah provenance, token index, subject/predicate/target surfaces where available, polarity, confidence, and whether the relation is heuristic.

## Root and lemma boundary

The engine exposes `stemCandidate` and a low-confidence `rootCandidate` only when simple corpus-surface stripping leaves exactly three letters. It always returns `canonicalRoot=null`. This is deliberate: v4.29 does **not** claim authoritative classical Arabic morphology without internal proof.

## Polarity preservation

Negation is carried into the relation graph. Examples covered by regression tests include:

- Q7:28 → `DOES_NOT_COMMAND`, never `COMMANDS`.
- Q4:48 → both `DOES_NOT_FORGIVE` and the coordinated affirmative `FORGIVES` relation are preserved separately.
- Q6:144 → `DOES_NOT_GUIDE`.
- Q2:190 / Q2:195 → `DOES_NOT_LOVE` and `LOVES` remain distinct.
- Q16:90 → `COMMANDS` plus coordinated `FORBIDS`.

This fixes a class of earlier surface-parser errors in which the verb was preserved but its negation was lost.

## Runtime / install contract

`data/revelation/grammar-profile.json` is a seeded, non-normative engineering profile. Its SHA-256 is pinned in:

`REVELATION-INDEX::GRAMMAR`

The current install contract therefore contains **8** derived Revelation indexes.

## Current corpus snapshot

The v4.29 certification snapshot over 6,236 Qur'an ayahs reports 10,578 structural frames, including 186 prohibition frames, 378 explicit-condition frames, 35 coordinated Divine-predicate frames, 350 vocative frames, and 960 speech frames. Candidate counts are parser telemetry, not counts of revealed laws or grammatical certainties.

## Invariants

- `normativeAuthority=false`
- `externalLexiconUsed=false`
- `canonicalRootClaimed=false`
- `rootCandidateIsEngineeringHeuristic=true`
- `textualWitnessGrammarMayOutvoteQuran=false`
- grammar frames do not compute a Divine verdict
