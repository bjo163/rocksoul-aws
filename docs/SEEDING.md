# MoonWitness OS — Seed and Verification Contract

## Canonical sources

`data/seed/manifest.json` is the canonical installation list. v4.24.0 introduced `data/divine-books/revelation-corpus-manifest.json` as the integrity contract for the four Revelation corpora.

Preflight fails if a required runtime dataset is not explicitly present in the seed manifest. The repository no longer relies on undisclosed auto-discovery for required Revelation runtime data.

## Revelation corpus contract

The corpus manifest is data-driven; installer code does not contain a hardcoded total passage count.

| Book channel | Typed entity | Records | Runtime authority |
| --- | --- | ---: | --- |
| Qur'an | `QURAN_AYAH` | 6,236 | `PRIMARY_MUHAIMIN` |
| Tawrat witness | `DIVINE_BOOK.TAWRAT_WITNESS_PASSAGE` | 5,852 | corroboration only |
| Zabur witness | `DIVINE_BOOK.ZABUR_WITNESS_PASSAGE` | 2,461 | corroboration only |
| Injil witness | `DIVINE_BOOK.INJIL_WITNESS_PASSAGE` | 3,779 | corroboration only |

Total current Revelation passages: **18,328**.

Tawrat/Zabur/Injil rows must preserve `sourceClass=TEXTUAL_WITNESS` and `originalRevelationEquated=false`. Their presence in seed does not upgrade them to original-revelation identity or primary normative authority.

## Structured vs snapshot seed

Structured sources become individual typed entities. Revelation JSONL corpora are structured sources and must never be stored as one giant `DATASET_SNAPSHOT`.

Operational JSON that does not yet have a dedicated entity model remains a `DATASET_SNAPSHOT`. Each entity or snapshot receives `_seed` provenance with source id, path, format, index, file SHA-256 and kind.

## Installation completion gate

With seed enabled, installation is successful only if all of the following pass:

1. corpus-manifest count + checksum verification;
2. general seed reconciliation;
3. exactly the manifest-declared typed Revelation row counts are present;
4. runtime datasets load from the seeded persistence store;
5. derived corpus/Asma/Moral-Graph/Native-Binding/Scoring indexes are persisted with the current corpus fingerprint and binding-profile SHA-256;
6. the ten-case Revelation smoke matrix passes;
7. event and audit chains verify.

`npm run revelation:install-verify` can rerun the Revelation-specific reconciliation against an already-seeded store.

## Runtime source of truth

In PostgreSQL mode, `initializeRuntimeData()` reconstructs JSON/JSONL datasets from seeded database entities. The four-book corpus loader consumes those seeded arrays when runtime data is initialized. Local corpus files remain reproducible seed/fallback artifacts, not an excuse to silently bypass a missing PostgreSQL seed.

## v4.25 native-binding seed artifact

`data/revelation/language-concept-anchors.json` is an explicit required runtime dataset and is included in the canonical seed manifest. It is not normative scripture data. Its contract is intentionally narrow:

- may identify language concepts and Arabic corpus query surfaces;
- must not contain `Q<chapter>:<verse>` mappings;
- must not contain moral direction or moral score;
- `normativeAuthority=false`;
- its SHA-256 is included in `REVELATION-INDEX::NATIVE-BINDING` verification.

The current seed manifest contains **105 explicit sources** and **18,569 seed entities**, of which **18,328** are typed Revelation passages.


## v4.26 scoring seed artifact

`data/revelation/scoring-profile.json` contains only engineering mathematics and has `normativeAuthority=false`. It cannot create direction or scripture grounding. Together with `data/semantic/registry.json`, its SHA-256 is pinned in `REVELATION-INDEX::SCORING`. This makes the analytical formula and 13 OUT query lens reproducible across install/reopen without treating the numbers as Revelation.

## v4.27 event interpreter seed

`data/events/event-language-profile.json` is a required runtime seed with `normativeAuthority=false`. Installation builds `REVELATION-INDEX::EVENT-INTERPRETER`, storing the current corpus fingerprint plus the event-profile SHA-256. The profile is language/epistemic configuration only and cannot create a Revelation reference or moral direction. Current install verification therefore requires **nine** derived Revelation indexes.

## v4.28 Lifecycle seed contract

`data/events/moral-lifecycle-language-profile.json` and `data/revelation/lifecycle-query-profile.json` are required runtime seed sources. Their combined SHA-256 is pinned by `REVELATION-INDEX::MORAL-LIFECYCLE`. Current install verification requires nine derived Revelation indexes.

## v4.29 Grammar seed contract

`data/revelation/grammar-profile.json` is a required non-normative runtime dataset. The canonical seed manifest now contains **105 sources / 18,569 entities**. Installation requires **8** derived Revelation indexes, adding `REVELATION-INDEX::GRAMMAR`.


## v4.30 Divine Ontology seed

`data/revelation/divine-ontology-profile.json` is a required runtime snapshot with `normativeAuthority=false`. Installation builds `REVELATION-INDEX::DIVINE-ONTOLOGY` and verifies its profile SHA together with the Revelation corpus fingerprint. Current install verification requires **nine** derived Revelation indexes.
