# MoonWitness OS v4.24.0 — Typed Revelation Seed & Install Certification

## Purpose

v4.24.0 makes the four-book Revelation corpus a first-class installation contract rather than a set of files that merely happen to exist beside the runtime.

## Typed Revelation seed

`data/divine-books/revelation-corpus-manifest.json` is the canonical corpus integrity manifest. It records the path, seed source id, typed entity, record count, SHA-256, role, and source class for each admitted corpus.

The current manifest contains 18,328 passages:

- Qur'an: 6,236 `QURAN_AYAH` records — `PRIMARY_MUHAIMIN`.
- Tawrat textual witness: 5,852 `DIVINE_BOOK.TAWRAT_WITNESS_PASSAGE` records — `CORROBORATIVE_ONLY`.
- Zabur textual witness: 2,461 `DIVINE_BOOK.ZABUR_WITNESS_PASSAGE` records — `CORROBORATIVE_ONLY`.
- Injil textual witness: 3,779 `DIVINE_BOOK.INJIL_WITNESS_PASSAGE` records — `CORROBORATIVE_ONLY`.

The textual-witness records retain `sourceClass=TEXTUAL_WITNESS` and `originalRevelationEquated=false`; installation never promotes them to original-revelation identity.

## Installer behavior

`db:install` and the interactive installer now:

1. verify the four corpus files against manifest-driven record counts and SHA-256 values;
2. seed all four corpora as typed entities rather than `DATASET_SNAPSHOT` blobs;
3. reconcile typed database counts/checksums;
4. initialize runtime data from the seeded persistence store;
5. build persisted derived indexes for corpus state, Pure Revelation Asma discovery, and the Revelation Moral Graph;
6. verify the derived-index corpus fingerprint;
7. run the canonical 10-case Revelation smoke matrix;
8. fail closed if any required stage fails.

The previous hardcoded installer wording `6,564 entities expected` is removed. Seed counts are calculated from the manifest/preflight contract.

## Runtime behavior

When runtime data has been initialized from PostgreSQL, Tawrat/Zabur/Injil loaders now consume the typed seeded arrays. Local files remain the reproducible deployment/fallback artifacts for local/test mode.

Qur'an remains the sole source allowed to establish primary moral direction. Tawrat/Zabur/Injil textual witnesses have equal corroboration-channel treatment and may affect grounding confidence only; they cannot create or reverse moral direction.

## Seed reconciler correction

The generic seed verifier previously rediscovered explicitly structured sources as implicit snapshots during reconciliation. This became visible when the three witness JSONL corpora became first-class structured sources. v4.24.0 fixes discovery to exclude already-declared manifest paths, preventing duplicate false failures.

## Verification

The release adds `tests/revelation-seed-install.test.ts` and the reusable `REVELATION_10_CASE_SMOKE_V2` runner. The install test seeds the complete repository into in-memory persistence, verifies exactly 18,328 Revelation passage records, initializes runtime data from those seeded records, builds/validates derived indexes, and runs all ten behavioral cases.

The 10-case suite still reports one case as fully `pureRevelationDerived`; most Indonesian action-to-passage bindings remain transitional. This release does not hide that remaining semantic-purity gap.
