# Test Report — v4.22.0

## Revelation / Asma

`npm run test:revelation` passes.

Observed deterministic test snapshot on the bundled Qur'an corpus:

```text
Qur'an ayahs                 6236
Asma surface candidates      1754
Explicit Divine relations      82
Moral graph edges              82
```

The 1,754 value is a surface-discovery count, **not** a theological count of Divine Names.

Verified examples include:

```text
Q2:195  LOVES
Q2:190  DOES_NOT_LOVE
Q16:90  COMMANDS + same-ayah FORBIDS continuation
Q39:53  FORGIVES
Q2:77   KNOWS
```

The HTTP integration test also verifies `/api/v1/revelation/asma`, `/api/v1/revelation/moral-graph`, and `/api/v1/revelation/core`, and verifies that the removed `/api/v1/revelation/divine-attributes` route returns 404.

Tests also verify:

- old `src/engines/asma.ts` absent;
- old 99-name JSON absent;
- old hand-authored Asma semantic profiles absent;
- every candidate retains Qur'an reference provenance;
- semantic fields use `CORPUS_COOCCURRENCE_ONLY`;
- 99 is not hardcoded;
- human-curated Asma list is not used;
- unavailable earlier-book corpora are not synthesized;
- moral graph has RED/GREEN/BLUE/LIGHT inspection lanes;
- RGBL mapping is explicitly labelled engineering interpretation.

## Semantic regression

`npm run test:semantic` passes:

```text
automatic semantic engine     3/3
AI → Mizan contract            2/2
analyzer priorities            7/7
Qur'anic Mizan                12/12
config parser                  2/2
```

## Witness regression

`npm run test:witness` passes all seven witness/runtime files, covering:

- Q-DAG integrity;
- distributed-primitives regression;
- v4.17 Merkle/key/chunk primitives;
- v4.18 encrypted single-node key custody;
- v4.19 Q-DAG restart/backup/recovery;
- FileProvider concurrency;
- HTTP single-node restart persistence.

## Additional checks

```text
API TypeScript strict check    PASS
data/contracts validation      PASS
engine/system audit            PASS
legacy justice detachment      PASS
legacy engine detachment       PASS
```

Live PostgreSQL certification remains deployment-specific because it requires an accessible target PostgreSQL service.
