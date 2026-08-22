# Test Report — v4.27.0

## Event Interpreter

- parser invariant test: PASS.
- adversarial Event/Mizan suite: **100/100 PASS**.
- groups: direct theft, negation, theft+restoration, mistake+return, permission, lying, principle conflict, unsupported accusation, verification, helping — each 10/10.

## Revelation

- canonical Revelation smoke: **10/10 PASS**.
- native Revelation-derived direction: 9/10.
- smoking: `UNRESOLVED`, no Revelation alignment or analytical score.
- Qur'an corpus: 6,236 passages.
- Tawrat textual witness: 5,852 passages.
- Zabur textual witness: 2,461 passages.
- Injil textual witness: 3,779 passages.
- total typed Revelation passages: **18,328**.
- Pure Revelation Asma and Revelation Moral Graph regression: PASS.
- Revelation-grounded RGBL/13 OUT regression: PASS.

## Install contract

- seed manifest sources: 102.
- seeded entities in current fixture: 18,566.
- six derived indexes verified:
  - `REVELATION-INDEX::CORPUS`
  - `REVELATION-INDEX::ASMA`
  - `REVELATION-INDEX::MORAL-GRAPH`
  - `REVELATION-INDEX::NATIVE-BINDING`
  - `REVELATION-INDEX::SCORING`
  - `REVELATION-INDEX::EVENT-INTERPRETER`
- event-language profile SHA-256 verified.
- clean file-driver install and reopen `revelation:install-verify`: PASS.

## Regression

- semantic/Mizan suite: PASS.
- Witness/Q-DAG/single-node suite: PASS.
- Revelation HTTP API: PASS.
- API strict TypeScript build: PASS.
- final certification: PASS, including the 100-case suite.

## Interpretation boundary

These results certify reproducible software behavior for tested inputs. They do not certify exhaustive interpretation of every human action, divine reward/punishment magnitude, hidden intention, or final judgement by Allah.
