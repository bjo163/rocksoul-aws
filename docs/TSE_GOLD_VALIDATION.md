# TSE External Gold Validation

This document defines the first external astronomical regression gate for the Temporal Significance Engine integration spike.

## Independent reference

The reference values come from the U.S. Naval Observatory annual sunrise/sunset tables, not from the TSE implementation. The USNO service documents that its Sun/Moon altitude/azimuth data use the apparent disk center and standard atmospheric refraction, and its annual rise/set tables use a standard-time zone with an explicit note to add one hour where daylight time is in use.

Reference vectors in `tests/tse-usno-gold.test.ts`:

- Washington, DC — 28 Aug 2026: fixture local values 06:34 / 19:44 in `America/New_York`.
- Seattle, WA — 28 Aug 2026: fixture local values 06:22 / 19:57 in `America/Los_Angeles`.

The test allows a three-minute event-time tolerance. These are event-timing regression vectors, not proof of any Qur'anic relationship or temporal-significance hypothesis.

## Why this is a useful gate

The goal is to catch:

- timezone conversion mistakes,
- cross-date mistakes,
- incorrect rise/set event selection,
- provider regressions,
- accidental changes to the TSE temporal contract.

The gold vectors are deliberately kept separate from TSE scoring and hypothesis evaluation so they cannot create circular evidence.
