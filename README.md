<div align="center">

# AWS

## ANGEL WITH SHOTGUN

### **TRACE THE LAW.**

#### **WAS IT ALLOWED?**

A provenance-first **International Law & Regulation Intelligence** repository for reconstructing applicable law, jurisdiction, legal status, competing arguments, uncertainty, and explainable Mizan analysis.

**MOONWITNESS RESEARCH · STORY × EVENT × PERSON × RGBL × AWS**

</div>

---

> **Evidence can tell us what happened. Law asks something else.**

A legal text can exist without applying to a case.  
A State can sign without ratifying.  
A rule can bind one actor without binding every actor.  
A judgment can interpret law without becoming a universal statute.  
A disputed legal position is not automatically false.  
A legal conclusion is not the same thing as a Mizan assessment.

That separation is the foundation of AWS.

## Core question

```text
WHAT conduct is being evaluated?
WHO are the relevant actors?
WHEN and WHERE did it occur?
WHICH legal system / forum can govern it?
WHICH instrument or rule was in force?
WHO was bound by it?
WHAT exceptions, reservations, declarations, or competing rules matter?
WHAT evidence supports each legal proposition?
WHAT remains disputed or unresolved?
```

## Golden rule

### **LEGAL TEXT ≠ APPLICABLE LAW**

```text
SOURCE
  ↓
LEGAL INSTRUMENT / RULE
  ↓
JURISDICTION
  ↓
TEMPORAL + TERRITORIAL + PERSONAL + SUBJECT-MATTER APPLICABILITY
  ↓
LEGAL CLAIMS + COUNTERCLAIMS
  ↓
EVIDENCE + PROVENANCE
  ↓
LEGAL ANALYSIS
  ↓
OPTIONAL MIZAN ASSESSMENT
```

## Fifth Rocksoul domain

| Domain | Question | Ownership |
|---|---|---|
| **STORY** | What was told? | narrative / story layer |
| **EVENT** | What happened? | event / historical-fact layer |
| **PERSON** | Who crossed the frame? | person / actor / transmission layer |
| **RGBL** | What does the source actually say? | exact text / revelation-reference layer |
| **AWS** | **Was it allowed?** | law / applicability / legal-analysis layer |

AWS consumes cross-repository references. It does **not** duplicate canonical STORY, EVENT, PERSON, or RGBL objects.

[Read the interoperability contract →](docs/ROCKSOUL_INTEROP.md)

## Legal-result vocabulary

AWS does not reduce international law to one opaque score.

Public-facing legal-result states begin with:

```text
PERMITTED
RESTRICTED
PROHIBITED
DISPUTED
UNRESOLVED
```

Applicability is tracked separately:

```text
APPLICABLE
NOT_APPLICABLE
PARTIALLY_APPLICABLE
UNCERTAIN
```

A result must preserve the legal basis, jurisdiction, source, evidence, contrary authority, time/place scope, confidence, and unresolved questions that produced it.

## Research source model

AWS prioritizes retrievable, attributable legal material:

1. official treaty/depositary text and status;
2. constitutive instruments and official legal databases;
3. judgments, orders, and advisory opinions of competent international tribunals;
4. official treaty-body, monitoring, implementation, and institutional material;
5. official State material when legally relevant;
6. high-quality scholarship as secondary analysis, never silently promoted into primary authority.

**No generated citation becomes canonical merely because an AI produced it.**

[Read the research model →](docs/LEGAL_RESEARCH_MODEL.md)

## Automatic research, bounded conclusions

AWS is designed to grow continuously, but automation is **research-first, never auto-verdict**.

```text
DISCOVER
  ↓
DE-DUPLICATE
  ↓
FETCH OFFICIAL SOURCE
  ↓
HASH + PROVENANCE
  ↓
EXTRACT CANDIDATE LEGAL OBJECTS
  ↓
CROSS-CHECK
  ↓
APPLICABILITY CHECK
  ↓
RESEARCH ISSUE / REVIEW
  ↓
CANONICALIZE
  ↓
RE-ANALYZE AFFECTED CASES
```

Treaty actions, reservations, declarations, withdrawals, new judgments, corrigenda, supersession, and source changes may trigger re-analysis. They must never silently rewrite historical research.

[Read the automation contract →](docs/AUTOMATION.md)

## Canonical machine contracts

The legal-domain contracts in `schemas/` now include:

- `legal-source.schema.json`
- `legal-instrument.schema.json`
- `jurisdiction.schema.json`
- `treaty-action.schema.json`
- `applicability.schema.json`
- `legal-claim.schema.json`
- `legal-assessment.schema.json`
- `cross-repo-case.schema.json`

Stable identifiers use explicit prefixes such as:

```text
LAW-...
JUR-...
TACT-...
APPL-...
LCLAIM-...
LASSMT-...
```

Runtime SQL tables, search indexes, embeddings, caches, and derived scores are rebuildable implementation artifacts. Canonical research remains provenance-bearing data.

## Research guardrails

**SIGNATURE ≠ RATIFICATION.**

**RATIFICATION ≠ UNIVERSAL APPLICABILITY.**

**JURISDICTION ≠ MERITS.**

**RESOLUTION ≠ TREATY.**

**TEXTUAL PRESENCE ≠ LEGAL FORCE.**

**LEGALITY ≠ MORAL GOODNESS.**

**MIZAN ≠ COURT JUDGMENT.**

**DISPUTED ≠ FALSE.**

**MISSING ≠ PERMITTED.**

**MISSING ≠ PROHIBITED.**

**UNCERTAINTY IS DATA.**

This is a research and analysis system, not a substitute for case-specific professional legal advice.

## MoonWitness / UI boundary

The UI and visual design source of truth remains **`rocksoul-assets`**, including the public STORY / EVENT / PERSON / RGBL / AWS navigation and legal-analysis screens.

AWS owns machine contracts, research data, ingestion, legal analysis, and APIs. It does not become the design-source repository.

## Branch model

```text
main   ← stable / release
dev    ← all development
```

No other remote branches are part of the repository contract. Development lands directly in `dev`; release promotion is only `dev → main`. Release automation may create tags/releases, never release branches.

[Read the canonical branching contract →](docs/BRANCHING.md)

## Current repository state

This repository was created from a mature MoonWitness/Cosmic-derived engine codebase. That inherited code is useful technical substrate—persistence, orchestration, evidence, Mizan, review, audit, and API infrastructure—but its old **Cosmic** naming and astronomy/revelation-specific surfaces are **not** the canonical AWS domain definition.

Migration therefore proceeds in layers:

```text
PHASE 0  DOMAIN CONTRACT        ✓
PHASE 1  LEGAL CORPUS PROOF     ✓
PHASE 2  PERSISTENCE + SOURCE WORKER ✓
PHASE 3  OFFICIAL-SOURCE INGESTION
PHASE 4  APPLICABILITY ENGINE
PHASE 5  LEGAL + MIZAN ANALYSIS
PHASE 6  CROSS-REPO CASE GRAPH
PHASE 7  CONTINUOUS RESEARCH / RE-ANALYSIS
```

Do not bulk-rename or delete inherited engine packages until their replacement/retention role is explicit and tested.

## Documentation

Start here:

- [Documentation index](docs/README.md)
- [Branching contract](docs/BRANCHING.md)
- [Legal research model](docs/LEGAL_RESEARCH_MODEL.md)
- [Rocksoul interoperability](docs/ROCKSOUL_INTEROP.md)
- [Automation & freshness](docs/AUTOMATION.md)
- [Canonical legal data](data/aws/README.md)
- [Five-domain case — Jerusalem 70 CE](docs/cases/JERUSALEM-70-FIVE-WAY.md)
- [Phase-2 persistence & source worker](docs/AWS-PHASE-2-RUNTIME.md)
- [Foundation issue #101](https://github.com/bjo163/rocksoul-aws/issues/101)
- [Phase-1 issue #103](https://github.com/bjo163/rocksoul-aws/issues/103)

---

<div align="center">

## **ANGEL WITH SHOTGUN**

### **EVIDENCE FINDS THE LINE. LAW ASKS IF SOMEONE CROSSED IT.**

**TRACE · VERIFY · APPLY · ARGUE · WEIGH**

</div>
