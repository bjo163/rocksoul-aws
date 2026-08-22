# Revelation Textual-Witness Corpora

MoonWitness treats these files as **transmitted textual witnesses**, not as a claim that an extant edition is identical to the originally revealed Tawrat, Zabur, or Injil.

Runtime roles:

- `QURAN`: primary / muhaimin full-text corpus.
- `TAWRAT`: Pentateuch textual witness (`Genesis`, `Exodus`, `Leviticus`, `Numbers`, `Deuteronomy`).
- `ZABUR`: Psalms textual witness (`Psalm`).
- `INJIL`: four-Gospel textual witness (`Matthew`, `Mark`, `Luke`, `John`).

The three witness channels have equal corroboration weight. They may raise grounding confidence when a passage match exists, but they cannot create a moral direction, reverse a Quran-grounded direction, or generate a divine verdict.

The bundled witness text is the public-domain KJV Pure Cambridge Edition plain-text witness retrieved from the source recorded in `import-manifest.json`. The manifest retains hashes and provenance. Human translation/transmission status is never hidden.

`npm run revelation:import-witnesses` can rebuild witness JSONL corpora from a compatible local source. The importer is infrastructure; the committed JSONL files are the reproducible runtime snapshot for v4.26.0.
