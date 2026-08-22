# Four-Book Corroboration — v4.27

## Decision

MoonWitness uses four admitted revelation categories, but does **not** use a four-way vote.

```text
QURAN
PRIMARY / MUHAIMIN
        │
        ├── TAWRAT textual witness ─┐
        ├── ZABUR textual witness ──┼─ confidence-only corroboration
        └── INJIL textual witness ──┘
```

The Quran establishes the primary runtime direction. Tawrat, Zabur and Injil textual witnesses may corroborate a compatible pattern, but they cannot independently create a moral direction or reverse a Quran-grounded direction.

## Bundled runtime corpora

The bundled runtime corpora are:

| Channel | Runtime text | Records | Role |
|---|---:|---:|---|
| QURAN | Arabic Quran corpus | 6,236 | `PRIMARY_MUHAIMIN` |
| TAWRAT | Pentateuch KJV textual witness | 5,852 | `CORROBORATIVE_ONLY` |
| ZABUR | Psalms KJV textual witness | 2,461 | `CORROBORATIVE_ONLY` |
| INJIL | Matthew/Mark/Luke/John KJV textual witness | 3,779 | `CORROBORATIVE_ONLY` |

The three non-Quran corpora are explicitly labelled `TEXTUAL_WITNESS`. Their transmitted/translated form is not silently equated with the originally revealed Tawrat, Zabur or Injil. Exact source and SHA-256 provenance are retained in `data/divine-books/witness-corpora/import-manifest.json`.

## Fair weighting

Each witness channel has equal channel weight `1`. Weight is used only after a sufficiently specific semantic/lexical match.

```text
matched witness books / 3
        ↓
corroboration ratio
        ↓
maximum confidence boost = 0.30
```

Thus one matched witness channel can contribute up to `0.10`, two up to `0.20`, and all three up to `0.30`. This is an **engineering confidence value**, not a revealed weight.

v4.25 receives non-normative witness query phrases from the Native Revelation Binding language profile. Matching remains deliberately strict: exact/multi-token textual support is preferred, weak single-word overlap contributes zero, and a conflict must raise uncertainty rather than be averaged away. Query phrases cannot supply moral direction; they only help locate potentially corroborative witness passages.

## What corroboration cannot do

- cannot make an action good/bad without a Quran/core anchor;
- cannot overrule a Quran-grounded direction;
- cannot turn textual similarity into a divine verdict;
- cannot supply missing empirical facts;
- cannot turn an extant translation/transmission into a claim of original-revelation identity.

## Import/rebuild

The committed v4.23 witness corpora are reproducible. The importer accepts either per-book JSON sources or a compatible verse-per-line plain-text source:

```bash
npm run revelation:import-witnesses -- --source-file /path/to/kjv-full.txt
npm run revelation:import-witnesses -- --source-dir /path/to/kjv/books
npm run revelation:import-witnesses -- --fetch
```

All imported records retain `sourceClass=TEXTUAL_WITNESS` and `originalRevelationEquated=false`.


## v4.24 seed/runtime integration

The three corroborative corpora are no longer file-only sidecars. They are seeded as typed passage rows and read from initialized runtime persistence when available. Channel policy is unchanged: equal witness treatment, confidence-only contribution, no standalone moral direction, no reversal of Qur'an direction, and zero contribution when no sufficiently specific match exists.

## v4.25 relationship to native binding

Native moral direction must be established from the Qur'an/core binding first. The three textual witnesses are evaluated only afterward. Their equal-channel boost remains capped at `+0.10` per matched book and `+0.30` combined. This number is engineering confidence telemetry; it is not a revealed hierarchy or voting weight.


## v4.27 event-aware query boundary

Corroboration runs only after event interpretation and Qur'an/core native binding. Query phrases are taken from the resolved scripture-binding profile/action concepts, not arbitrary raw user-text tokens. Negated, merely reported, permission-invalidated or otherwise suppressed event nodes therefore cannot gain witness confidence simply because their surface words occur in a textual witness. The three witness channels remain confidence-only and cannot resolve an event-state conflict by voting.

## v4.29 Grammar boundary across four books

Qur'an is the active primary grammar source. Tawrat/Zabur/Injil textual witnesses continue to contribute corroboration confidence only. Their transmitted-language grammar cannot reverse or outvote a Qur'an structural relation.
