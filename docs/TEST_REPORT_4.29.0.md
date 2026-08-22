# Test Report — v4.29.0

## Revelation Grammar

- Real Qur'an corpus: PASS (6,236 ayahs).
- Structural frames: 10,578.
- Explicit Divine relations after grammar/polarity refactor: 143.
- Grammar adversarial matrix: **100/100 PASS**.
- Q7:28 negation regression: PASS (`DOES_NOT_COMMAND`).
- Q4:48 polarity + coordinated forgiveness regression: PASS.
- Q6:144 negated guidance regression: PASS.
- Q16:90 command/forbid coordinated relation: PASS.
- External lexicon usage: false.
- Canonical Arabic root claim: false.

## Existing engine regression

- Revelation 10-case: **10/10 PASS**.
- Native Revelation direction: **9/10**; smoking remains `UNRESOLVED`.
- Semantic/Mizan suite: PASS.
- Event adversarial: **100/100 PASS**.
- Moral Lifecycle adversarial: **100/100 PASS**.
- Witness/Q-DAG regression: PASS.
- API Revelation HTTP test including `/revelation/grammar`: PASS.
- API TypeScript strict build: PASS.
- Schema/contracts: PASS.
- API↔Web contract: PASS.
- Preflight: PASS.
- Final certification: PASS.

## Seed / install

- Seed sources: **105**.
- Seed entities: **18,569**.
- Typed Revelation passages: **18,328**.
- Derived Revelation indexes: **8**.
- `REVELATION-INDEX::GRAMMAR` profile fingerprint: verified.
- Clean file-provider install: PASS.
- Reopen + `revelation:install-verify`: PASS.

Live PostgreSQL execution remains deployment-specific because no live PostgreSQL target is available in the build environment.
