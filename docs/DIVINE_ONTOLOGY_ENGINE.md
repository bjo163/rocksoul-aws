# Pure Revelation Divine Ontology Engine — v4.30.0

## Purpose

The Divine Ontology layer is the structural output of the Pure Revelation Asma Engine. It does **not** load a human-curated 99-name catalog and it does not decide human moral scores. It organizes what the available Revelation corpus actually attests about Divine-reference surfaces and explicit Divine relations so downstream Moral Graph/Mizan layers can reason with provenance.

## Position

```text
FOUR REVELATION SOURCE POLICY
        ↓
QURAN PRIMARY / MUHAIMIN GRAMMAR
        ↓
ASMA SURFACE + EXPLICIT RELATION MINING
        ↓
DIVINE ONTOLOGY
        ├── scripture-attested surface concepts
        ├── corpus-context clusters
        ├── relation families
        └── explicit relation-target concepts
        ↓
REVELATION MORAL GRAPH
        ↓
EVENT → RGBL → 13 OUT → MIZAN
```

Tawrat, Zabur and Injil remain transmitted textual-witness corroboration channels. They do not outvote the Qur'an and do not create a canonical Divine Name.

## Ontology layers

### 1. Surface concepts

Exact normalized Divine-reference surface candidates are grouped across their own Qur'an attestations. A surface concept retains candidate IDs, references, extraction frames, attestation count and local context tokens.

Statuses are deliberately limited to scripture-attested/corroborated **surface concepts**. Neither status means `CANONICAL_DIVINE_NAME`.

### 2. Context clusters

Repeated surface concepts may be joined only when corpus-internal context similarity passes the versioned engineering threshold in `data/revelation/divine-ontology-profile.json`.

The profile has `normativeAuthority=false`. A cluster is an analytical discovery structure; it cannot create a name, attribute, command, prohibition, reward, warning or moral rule.

### 3. Relation families

Explicit grammar-derived Divine relations are grouped into polarity-preserving families:

- LOVE: `LOVES` / `DOES_NOT_LOVE`
- COMMAND: `COMMANDS` / `DOES_NOT_COMMAND`
- FORGIVENESS: `FORGIVES` / `DOES_NOT_FORGIVE`
- GUIDANCE: `GUIDES` / `DOES_NOT_GUIDE`
- PROHIBITION
- KNOWLEDGE
- JUDGEMENT

The family only organizes explicit relation evidence; individual ayah relations remain authoritative evidence.

### 4. Relation-target concepts

The exact target surfaces of explicit Divine relations are deduplicated by corpus-normalized target text within the relation family. They retain polarity, relation types and exact references. These are not translated into a human moral ontology by an external lexicon.

## Current measured output

On the bundled 6,236-ayah Qur'an corpus under the v4.30 profile:

```text
surface concepts             1,751
corroborated surface concepts  328
strict context clusters          3
relation families                7
explicit relation targets      102
explicit Divine relations      143
```

The low cluster count is intentional: the release keeps a strict threshold rather than lowering it to manufacture many semantic families. None of these numbers is a count of the Names of Allah.

## Hard boundaries

```text
canonical99Hardcoded = false
humanCuratedNameListUsed = false
externalLexiconUsed = false
canonicalDivineNamePromotedAutomatically = false
canonicalArabicRootAssumed = false
clusterSimilarityIsNormativeEvidence = false
textualWitnessMayOutvoteQuran = false
explicitRevelationRemainsPrimaryEvidence = true
```

## Installation

`data/revelation/divine-ontology-profile.json` is a required runtime seed. Installation builds `REVELATION-INDEX::DIVINE-ONTOLOGY`, pinning the corpus fingerprint and ontology-profile SHA-256. The index is a reproducible cache/audit artifact, not an authority source.

## Validation

- `tests/revelation-divine-ontology.test.ts` validates polarity families, provenance and Moral Graph integration.
- `tests/revelation-divine-ontology-100-cases.test.ts` audits 100 discovered concepts for scripture provenance, cluster boundaries and non-canonical-name status.
- `npm run test:ontology` runs both suites.
