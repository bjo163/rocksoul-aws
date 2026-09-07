# AWS Phase 3B — Treaty Notices & Judicial Authority

## Goal

Complete the official-source layer needed before deterministic applicability.

```text
UNTC PARTICIPATION + NOTICES
            ↓
      TREATY ACTIONS
            │
            ├── signature
            ├── ratification
            ├── accession
            ├── succession
            ├── reservation
            ├── declaration
            ├── objection
            └── withdrawal

ICJ CASE + JUDGMENT
            ↓
      LEGAL AUTHORITY
```

## Legal authority is its own object

AWS does not store a judgment as if it were treaty text.

```text
TREATY TEXT != JUDGMENT
JUDGMENT != STATE POSITION
AUTHORITY != AUTOMATIC VERDICT
```

Canonical authority records live under `data/aws/authorities/`.

The first canonical authority is:

```text
AUTH-ICJ-91-JUDGMENT-2007-02-26
```

It represents the International Court of Justice judgment of 26 February 2007 in case 91.

## Treaty notices are historical actions

A reservation, objection, declaration, or withdrawal is not an in-place mutation of an instrument.

Each is preserved as a separate action:

```text
ACTION A
ACTION B
ACTION C
...
CURRENT INTERPRETATION = derived from history + authority
```

This prevents a later withdrawal from erasing the earlier reservation and prevents an objection from being treated as automatic invalidation.

## Missing dates

Some official depositary prose does not expose a clean action date next to every notice.

AWS therefore permits:

```text
action_date = null
```

for a notice whose date has not been verified.

Unknown is data. No date is invented.

## ICJ bundle

For the first judicial proof, case 91 is fetched as a source bundle:

```text
CASE PAGE
   +
JUDGMENT PAGE
   ↓
ONE VERIFIED BUNDLE
   ↓
ONE SOURCE FINGERPRINT
```

This avoids treating two URLs from the same judicial case as competing source heads.

## Source impact graph

```text
SRC-AWS-ICJ
    ↑
AUTHORITY
    ↑
LEGAL_CASE
```

A changed ICJ bundle can enqueue the affected legal case for re-analysis.

It cannot change the legal result directly.

## Guardrails

```text
RESERVATION != TREATY EXIT
OBJECTION != INVALIDATION BY DEFAULT
WITHDRAWAL != RETROACTIVE ERASURE
JURISDICTIONAL BASIS != MERITS
JUDGMENT != MIZAN
```
