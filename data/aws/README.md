# AWS Canonical Legal Data

This directory is the Phase-1 canonical research surface for **AWS — Angel With Shotgun**.

## Layout

```text
data/aws/
├── sources/          official-source registry
├── raw/              captured source metadata / provenance inputs
├── recipes/          deterministic normalization recipes
├── instruments/      canonical legal instruments
├── treaty_actions/    participation, reservations, objections, withdrawals
├── jurisdictions/    forum / competence records
├── authorities/      judgments, orders, advisory opinions
├── holdings/         narrow authoritative determinations
├── legal_cases/      AWS-native legal golden/research cases
├── applicability/    case × legal-basis applicability records
├── claims/           legal propositions and counterpositions
├── claim_assessments/ claim × applicability × holding determinations
├── case_syntheses/   multi-claim synthesis without binary flattening
├── assessments/      explainable legal / Mizan assessment records
└── cases/            five-domain integration records
```

## Canonicalization rule

```text
RAW OFFICIAL METADATA
        ↓
RECIPE
        ↓
DETERMINISTIC NORMALIZATION
        ↓
CANONICAL RECORD
        ↓
GRAPH VALIDATION
        ↓
REVIEW / PUBLICATION
```

The committed raw metadata is intentionally small. It records facts needed for deterministic normalization and preserves official-source URLs without mirroring whole external legal databases.

## Commands

```bash
npm run aws:ingest:icrc
npm run aws:ingest:icrc -- --check
npm run aws:validate
npm run test:aws
npm run aws:check
```

`aws:check` is network-free. Live official-source inspection is available through `aws:source:probe`; canonical verification remains fixture-driven and deterministic.

## Current Phase-1 seeds

- ICRC IHL Database source registry
- International Court of Justice source/forum registry
- United Nations Treaty Collection source registry
- Geneva Convention IV canonical instrument
- Genocide Convention canonical metadata seed
- Jerusalem 70 CE five-domain negative-applicability proof

## Critical invariant

**NOT_APPLICABLE ≠ PERMITTED.**

A legal basis that fails applicability cannot, by its absence alone, generate permission, prohibition, or a Mizan verdict.


## Phase-3B / Phase-4 canonical proofs

- Treaty participation and notice history for the Genocide Convention
- ICJ judgment authority for case 91
- AWS-native legal case: Bosnia and Herzegovina v. Serbia and Montenegro
- Five-dimension applicability result: `APPLICABLE`
- Case-level legal result remains `UNRESOLVED`
- Mizan remains `NOT_RUN`

This deliberately proves that applicability and jurisdiction can be established without collapsing a judicial decision into one binary merits verdict.


## Phase-5 canonical proof

The Bosnia / Serbia case now decomposes the final ICJ authority into separate holdings and claim assessments.

```text
jurisdiction       SUPPORTED
commission         CONTRADICTED
prevention breach  SUPPORTED
cooperation breach SUPPORTED
                   ↓
             MIXED_HOLDINGS
```

The case-wide legal result remains `UNRESOLVED` and Mizan remains `NOT_RUN`.

This is intentional: a mixed judicial disposition is not converted into one permission/prohibition label.
