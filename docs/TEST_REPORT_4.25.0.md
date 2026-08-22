# Test Report — v4.25.0

## Certification summary

- Qur'an: 6,236 typed ayahs — PASS
- Tawrat textual witness: 5,852 typed passages — PASS
- Zabur textual witness: 2,461 typed passages — PASS
- Injil textual witness: 3,779 typed passages — PASS
- Total Revelation passages: 18,328 — PASS
- Seed sources: 100 — PASS
- Seed entities: 18,564 — PASS
- Pure Revelation Asma: PASS
- Revelation Moral Graph: PASS
- Native Revelation Binding: PASS
- Four-book corroboration policy: PASS
- Native-Binding derived index/profile SHA: PASS
- Semantic/Mizan regression: PASS
- Witness/Q-DAG regression: PASS
- API TypeScript build: PASS
- Contract validation: PASS
- engine/justice focused regression: PASS
- file-driver `db:install` → reopen `revelation:install-verify`: PASS

## Canonical 10 cases

| # | Case | Direction | Native refs | Pure normative direction | Alignment score | Analytical score |
|---|---|---|---|---|---:|---:|
| 1 | employee accepts bribe | NEGATIVE | Q2:188, Q4:29, Q4:161, Q9:34 | yes | -100 | -28 |
| 2 | embezzles office funds | NEGATIVE | Q2:188, Q4:29, Q4:161, Q9:34 | yes | -100 | -28 |
| 3 | returns found wallet | POSITIVE | Q4:58 | yes | +98 | +41 |
| 4 | intentionally lies to customer | NEGATIVE | Q22:30 | yes | -98 | -22 |
| 5 | accuses neighbor without evidence | NEGATIVE | Q24:4, Q24:23 | yes | -100 | -15 |
| 6 | verifies source before sharing claim | POSITIVE | Q49:6 | yes | +88 | +35 |
| 7 | uses public budget personally | NEGATIVE | Q2:188, Q4:29, Q4:161, Q9:34 | yes | -100 | -27 |
| 8 | regular tobacco smoking | UNRESOLVED | — | no; empirical bridge absent | null | null |
| 9 | helps friend study without reward | POSITIVE | Q5:2 | yes | +88 | +34 |
| 10 | takes and keeps another person's property | NEGATIVE | Q5:38 | yes | -98 | -24 |

Result: **10/10 expected conditional directions; 9/10 pure Revelation-derived normative direction after language parsing.**

All person-level epistemic statuses in the smoke test remain `PROVISIONAL` because the test descriptions are reports, not independently verified evidence. `divineVerdict=false` remains invariant.

## Score interpretation

`revelationAlignmentScore` is not severity. A value near ±100 means the software has high confidence in the retrieved Revelation direction plus allowed corroboration, not that an act carries ±100 divine units. `analyticalScore` still uses engineering impact magnitude and is explicitly non-pure.

## Environment limitation

No live PostgreSQL server was available during this certification. PostgreSQL schema/TypeScript integration is retained, while live DB certification must be run against the deployment target. The generic `api:smoke` command also requires an already-running deployment plus explicit admin credentials; no credentials were fabricated for this build. Revelation native-HTTP API tests passed independently.
