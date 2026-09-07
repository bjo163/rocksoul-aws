# AWS Canonical Legal Data

This directory is the Phase-1 canonical research surface for **AWS — Angel With Shotgun**.

## Layout

```text
data/aws/
├── sources/          official-source registry
├── raw/              captured source metadata / provenance inputs
├── recipes/          deterministic normalization recipes
├── instruments/      canonical legal instruments
├── jurisdictions/    forum / competence records
├── applicability/    case × legal-basis applicability records
├── claims/           legal propositions and counterpositions
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

`aws:check` is network-free. Live source discovery and freshness polling belong to later workers.

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
