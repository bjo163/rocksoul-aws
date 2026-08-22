# Test Report — v4.21.0

## Revelation Semantic Core

- four-book policy: PASS
- external normative-source rejection: PASS
- unavailable Tawrat runtime corpus cannot acquire normative weight: PASS
- textual-witness class cannot silently become original-revelation authority: PASS
- bundled Qur'an count = 6,236: PASS
- Makkah literal occurrence = 1: PASS
- Bakkah literal occurrence = 1: PASS
- Umm al-Qura literal occurrences = 2: PASS
- all `al-Madinah` literal occurrences = 14: PASS
- internally identified Prophetic-community al-Madinah contexts = 4: PASS
- place mention != revelation location invariant: PASS
- Bakkah/Makkah identity not assumed: PASS
- Umm al-Qura/Makkah identity not assumed: PASS
- external Makki/Madani classification disabled in core: PASS
- corpus-derived Allah attribute candidates with exact references: PASS
- geography hypotheses remain `RESEARCH_ONLY`: PASS
- scripture research map remains `RESEARCH_ONLY_NOT_NORMATIVE_WEIGHT`: PASS

Deterministic research snapshot:

- protocol: `REVELATION_SEMANTIC_CORE_V1`
- version: `4.21.0`
- Qur'an ayahs: `6,236`
- direct place-expression hits in the current scan: `18`
- raw Allah-adjacent attribute/predicate candidates before validation: `1,567`

## Semantic/API regression

- automatic semantic engine: 3/3 PASS
- AI → Mizan contract: 2/2 PASS
- Qur'anic Mizan: 12/12 PASS
- API ↔ Web required route contract: 16 routes PASS
- API TypeScript `--noEmit`: PASS

## Witness/runtime regression

Seven prior witness/runtime test files were rerun after v4.21 integration and passed:

- Q-DAG integrity
- distributed-primitives regression
- v4.17 witness regression
- v4.18 persistent single-node identity
- v4.19 single-node completion/backup/recovery
- FileProvider concurrency
- HTTP single-node restart persistence

## Certification boundary

This report does **not** claim that a modern Tawrat/Zabur/Injil witness is identical to the original revelation. Those runtime corpora remain unavailable/manifest-only. It also does not claim live PostgreSQL certification in an environment without an accessible PostgreSQL target.
