# MoonWitness OS v4.23.0 — Four-Book Corroboration & Revelation Scorecard

## Added

- bundled Tawrat textual witness: Pentateuch, 5,852 verse records;
- bundled Zabur textual witness: Psalms, 2,461 verse records;
- bundled Injil textual witness: four Gospels, 3,779 verse records;
- SHA-256 witness-corpus provenance manifest;
- `src/revelation/corpus/` four-book corpus registry;
- `src/revelation/corroboration/` equal-channel confidence-only corroboration;
- `src/revelation/quran-passage-direction.ts` Quran Arabic directive-structure verifier;
- `src/revelation/revelation-scorecard.ts` layered analytical scorecard;
- `GET /api/v1/revelation/corpora`;
- reproducible witness importer with plain-text/local-JSON/fetch modes;
- ten-case Revelation behavior test.

## Source hierarchy

The release does not use majority voting across scripture witnesses. Quran remains primary/Muhaimin. Tawrat/Zabur/Injil textual witnesses are equal corroboration channels and can contribute confidence only.

## Scoring correction

v4.23 separates:

- moral direction;
- scripture grounding;
- corroboration confidence;
- engineering magnitude;
- epistemic verification state.

The `revelationScorecard` explicitly identifies when action-to-passage binding or magnitude still depends on the transitional language/engineering bridge. This prevents legacy action vectors from being mislabeled as revealed numeric values.

An indirect case that requires empirical facts, such as the current smoking example, returns `UNRESOLVED_WITHOUT_ALLOWED_EMPIRICAL_BRIDGE` and receives no Revelation analytical score when the permitted four-book corpus cannot establish the missing fact.

## Known next gap

The remaining major purity gap is **Revelation-native multilingual semantic binding**. Several ten-case directions are now verified against actual Quran directive structures, but the Indonesian action-to-passage retrieval candidate still originates in the legacy language bridge. v4.23 exposes this as `pureRevelationDerived=false` rather than hiding it.
