# TSE External Gold Validation

This document defines the first external astronomical regression gate for the Temporal Significance Engine integration spike.

## Independent reference

The reference values come from the U.S. Naval Observatory annual sunrise/sunset tables, not from the TSE implementation. The USNO service documents that its Sun/Moon altitude/azimuth data use the apparent disk center and standard atmospheric refraction, and its annual rise/set tables use a standard-time zone with an explicit note to add one hour where daylight time is in use.

Reference vectors in `tests/tse-usno-gold.test.ts`:

- Washington, DC — 28 Aug 2026: USNO standard-time sunrise 06:34 / sunset 19:44, converted to IANA-local EDT as 07:34 / 20:44.
- Seattle, WA — 28 Aug 2026: USNO standard-time sunrise 06:23 / sunset 19:57, converted to IANA-local PDT as 07:23 / 20:57.

The test allows a two-minute event-time tolerance. These are event-timing regression vectors, not proof of any Qur'anic relationship or temporal-significance hypothesis.

## Why this is a useful gate

The goal is to catch:

- timezone conversion mistakes,
- cross-date mistakes,
- incorrect rise/set event selection,
- provider regressions,
- accidental changes to the TSE temporal contract.

The gold vectors are deliberately kept separate from TSE scoring and hypothesis evaluation so they cannot create circular evidence.
