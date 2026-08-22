# v3.1.6 — Prophetic & Religious Knowledge Graph Base Data

This release extends the v3.1.5 divine-book base with catalog/reference data:

- enriched 25-prophet metadata and Quran references
- hadith collection catalog (metadata, not full corpus)
- religious terminology dictionary
- prophetic event catalog
- cross-source relations
- Quran ↔ prophet reference index
- mission reference tags

## Important modeling rule

`DIVINE_BOOK` is a theological/reference category. A later textual witness or modern edition is never silently asserted to be identical to the originally revealed book. Every textual witness must carry its own edition, language, provenance, and license metadata.

## Hadith
The collection catalog reflects the collection groupings exposed by Sunnah.com. This release intentionally does not bundle full hadith corpora.

## Sources
- Sunnah.com collections: https://sunnah.com/
- Quranic Arabic Corpus: https://corpus.quran.com/
