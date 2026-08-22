# Release Notes — v4.21.0

## Revelation Semantic Core

v4.21 hardens the current engine around a strict four-book source policy and adds scripture-text geography/name discovery without changing the single-node Witness/Q-DAG architecture.

### Added

- `src/revelation/scripture-source-policy.ts`
- `src/revelation/quran-corpus.ts`
- `src/revelation/revelation-geography.ts`
- `src/revelation/divine-attribute-discovery.ts`
- `src/revelation/revelation-semantic-core.ts`
- `data/revelation/source-policy.json`
- `data/revelation/corpus-status.json`
- `data/revelation/geography-hypotheses.json`
- `data/revelation/scripture-research-map.json`
- `tests/revelation-semantic-core.test.ts`
- `scripts/revelation-research.ts`
- Revelation research API endpoints.

### Source-policy change

Normative engine weight is now restricted to Qur'an, Tawrat, Zabur, and Injil. Qur'an is primary/Muhaimin. Other research sources have normative weight zero.

### Geography change

The engine now distinguishes textual place mention from revelation location. External Makki/Madani classification is not used by the Revelation Semantic Core. Direct Qur'an scanning produces corpus-derived Makkah/Bakkah/Umm al-Qura/al-Madinah profiles without hardcoding the user's hypothesis as truth.

### Divine-name change

The engine can discover candidate Allah-attribute phrases directly from the Qur'an corpus with provenance. A compatibility Asma index cannot self-certify a canonical divine name.

### Known boundary

Trusted Tawrat/Zabur/Injil runtime corpora are not yet bundled. Their status remains `TEXTUAL_WITNESS_MANIFEST_ONLY`, and runtime reasoning must return `CORPUS_UNAVAILABLE` instead of inventing text.

### Deep-research objects

`revelationSemanticCoreSnapshot()` now exposes the geography hypotheses and the four-book scripture research map as explicitly `RESEARCH_ONLY` objects. They are inspectable by API/research tooling but cannot automatically become normative Mizan rules.
