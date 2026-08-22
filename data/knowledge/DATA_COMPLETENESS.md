# Divine / Prophetic Corpus Completeness

## Bundled directly
- Qur'an: 114 surah, 6,236 ayah text/index package.
- Public-domain Bible witness infrastructure: KJV 1769 import path.
- 25 Prophet master data.
- Prophetic event/reference graph.
- Divine-book metadata and textual-witness structure.

## Importable, pinned corpora
- Hadith: hapiam/hadith-json `v1.5.0-hapi`, 18 unified book editions, fetched by `scripts/divine-books/import-hadith-corpus.ts`.
- KJV/Bible witnesses: `scripts/divine-books/import-kjv-witnesses.ts`.

The hadith corpus is deliberately not re-bundled blindly because the upstream project combines multiple sources and requires following upstream licensing and quality notes. Its own documentation exposes explicit flags for untranslated/no-source/appended/fuzzy-match records and recommends pinned tags. See the corpus manifest and upstream provenance.

## Important semantic distinction
`TAWRAT`, `ZABUR`, and `INJIL` are modeled as Divine Book categories. A modern textual witness such as the KJV Pentateuch/Psalms/Gospels is stored as a `TEXTUAL_WITNESS` edition and is never silently relabeled as the original revealed book itself.
