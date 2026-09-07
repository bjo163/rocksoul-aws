# CASE 001 — JERUSALEM 70 CE

## FIVE-DOMAIN LEGAL BOUNDARY PROOF

### STORY · EVENT · PERSON · RGBL · AWS

> **The legal layer joins the graph without rewriting history and without applying modern treaty law backwards in time.**

## Existing four-domain graph

```text
RGBL
Mark 13:2 exact passage identities
        │
        ▼
MFTL
MYTH-JERUSALEM-TEMPLE-DESTRUCTION-PROPHECY-000001
prediction narrative / interpretation
        │
        ▼
LEGEND
EVT-JERUSALEM-SECOND-TEMPLE-DESTRUCTION-70
historical event
        ▲
        │ witnessed / recorded
SUPERHERO
PER-JERUSALEM-FLAVIUS-JOSEPHUS
```

AWS adds a fifth question:

> **Can Geneva Convention IV be used as treaty law to classify the 70 CE event?**

## AWS legal basis

```text
LAW-IHL-GCIV-1949
Convention (IV) relative to the Protection of Civilian Persons in Time of War
adopted: 1949-08-12
entered into force: 1950-10-21
```

Official research anchors:

- ICRC treaty title: https://ihl-databases.icrc.org/en/ihl-treaties/gciv-1949/title
- ICRC Article 2 / application: https://ihl-databases.icrc.org/en/ihl-treaties/gciv-1949/article-2
- ICRC 2025 Commentary to Article 159 / entry into force: https://ihl-databases.icrc.org/en/ihl-treaties/gciv-1949/article-159/commentary/2025

## Five-way graph

```text
RGBL TEXT
   ↓
MFTL STORY
   ↓
LEGEND EVENT ───────────────┐
   ↑                        │
SUPERHERO PERSON            │
                            ▼
                     AWS LEGAL BASIS
                     GC IV / 1949
                            │
                            ▼
                     APPLICABILITY
                     temporal = FAIL
                            │
                            ▼
                     NOT_APPLICABLE
                            │
                            ▼
                     LEGAL RESULT
                       UNRESOLVED
```

## Why NOT_APPLICABLE

The historical event is dated to **70 CE**.

GC IV was adopted in **1949** and entered into force in **1950**.

AWS therefore refuses to treat GC IV as treaty law governing the first-century event.

```text
EVENT YEAR              70 CE
GC IV ADOPTION          1949
GC IV ENTRY INTO FORCE  1950

70 < 1949

TEMPORAL APPLICABILITY = DOES_NOT_APPLY
OVERALL GC IV BASIS     = NOT_APPLICABLE
```

## Why the result is not PERMITTED

This is the important part.

```text
GC IV DOES NOT APPLY
        ≠
ROME WAS LEGALLY PERMITTED
        ≠
ROME WAS LEGALLY PROHIBITED
        ≠
MORALLY GOOD
        ≠
MIZAN VERDICT
```

The Phase-1 output is therefore:

```text
APPLICABILITY  NOT_APPLICABLE
LEGAL RESULT   UNRESOLVED
MIZAN          NOT_RUN
REVIEW         REQUIRED
```

AWS has answered only the question it has evidence to answer: **this modern treaty is not a valid treaty-law basis for a 70 CE event**.

Research into Roman law, first-century legal practice, historically relevant norms, or other non-anachronistic frameworks is a separate future research problem.

## Stable references

```text
STORY
mftl:MYTH-JERUSALEM-TEMPLE-DESTRUCTION-PROPHECY-000001

EVENT
legend:EVT-JERUSALEM-SECOND-TEMPLE-DESTRUCTION-70

PERSON
superhero:PER-JERUSALEM-FLAVIUS-JOSEPHUS

RGBL
rgbl:mw:passage:sblgnt:v1-2:mark:13:2
rgbl:mw:passage:web-classic:2020:mar:13:2

AWS
LAW-IHL-GCIV-1949
APPL-JERUSALEM-70-GCIV
LCLAIM-JERUSALEM-70-GCIV-TEMPORAL
LASSMT-JERUSALEM-70-GCIV
CASE-AWS-JERUSALEM-70
```

## Machine proof

The AWS validator contains two adversarial invariants for this case:

1. changing the legal result from `UNRESOLVED` to `PERMITTED` while all legal bases are `NOT_APPLICABLE` must fail;
2. changing the 1949 treaty's temporal status to `APPLIES` for an event dated 70 CE must fail as anachronistic.

This is the first executable five-domain boundary case.

## Stop rule

```text
TEXT ≠ STORY
STORY ≠ EVENT
EVENT ≠ PERSON
EVIDENCE ≠ LAW
LAW TEXT ≠ APPLICABLE LAW
NOT_APPLICABLE ≠ PERMITTED
LEGAL RESULT ≠ MIZAN
```
