# Test Report — v4.26.0

## Revelation core

- 6,236 Qur'an ayat available.
- Tawrat textual witness: 5,852 passages.
- Zabur textual witness: 2,461 passages.
- Injil textual witness: 3,779 passages.
- total typed Revelation passages: 18,328.
- Pure Revelation Asma and Moral Graph regressions: PASS.
- Native Revelation binding: PASS.
- Revelation magnitude/RGBL/OUT tests: PASS.

## 10-case behavior

Expected direction: **10/10 PASS**.
Native Revelation direction derivation: **9/10**.
Smoking remains `UNRESOLVED` with `analyticalScore=null` and a zero OUT vector because no allowed empirical bridge is present.

Observed structural examples include:

- corruption -> PROPERTY / JUSTICE / PUBLIC / SYSTEMIC;
- lying -> TRUTH;
- unsupported accusation -> DIGNITY;
- restitution -> TRUST / REPAIR;
- theft -> PROPERTY.

## Regression

- semantic/Mizan suite: PASS.
- Witness/Q-DAG suite: PASS.
- API TypeScript build: PASS after supplying the declared Node type dependency in the build environment.
- preflight: PASS.
- final certification: PASS.
- file-provider clean install: PASS.
- reopen + `revelation:install-verify`: PASS.
- 5 derived Revelation indexes verified, including `REVELATION-INDEX::SCORING`.

## Environment boundary

Live PostgreSQL execution is not claimed because this build environment does not expose a target PostgreSQL service.
