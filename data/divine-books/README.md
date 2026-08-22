# Divine Books Corpus

This bundle uses one canonical `DIVINE_BOOK` schema for Tawrat, Zabur, Injil, and Quran.

## Quran
- 114 surahs
- 6,236 ayahs
- Full Arabic reference text included in `quran/ayahs.jsonl` from the TeX Live `quran` package simple-script corpus (LPPL).

## Tawrat / Zabur / Injil
The theological category is kept distinct from later textual witnesses. Public-domain KJV witness manifests are included for: Pentateuch (Tawrat witness), Psalms (Zabur witness), and the four canonical Gospels (Injil witness). These are explicitly marked `TEXTUAL_WITNESS` and are not asserted to be identical with the revealed books named in Islamic theology.

These witness manifests are **research-only** in v4.21 and have zero runtime normative weight. The four-book policy allows Tawrat/Zabur/Injil as revelation categories, but a manifest or later textual witness is not enough to activate normative reasoning. A deliberately trusted local corpus and explicit provenance are required.

For archival/research ingestion only, the existing importer can fetch the configured public-domain KJV witness files:

```bash
npm run data:import:kjv
```

The source repository is `midvash/bible-data`, whose KJV 1769 text is published as public domain. Verify the specific edition/licensing before redistribution outside your intended deployment.


## v4.21 source boundary

- Normative categories: Qur'an, Tawrat, Zabur, Injil only.
- Runtime-active canonical reference in this bundle: Qur'an Arabic corpus.
- Tawrat/Zabur/Injil: bundled transmitted textual-witness corpora, typed-seeded for corroboration only; never equated with the original revelation.
- Hadith, tafsir, historical chronology, medicine, law, news, and web research: zero normative weight.
- `placeMention`, `revelationLocation`, and `semanticFunction` are distinct fields.

## v4.24 typed seed

`revelation-corpus-manifest.json` is the installation integrity manifest for Qur'an + Tawrat/Zabur/Injil textual-witness corpora. The seed installer validates record count and SHA-256 before persisting each JSONL row as a typed entity. The manifest, not installer source code, defines expected corpus counts.
