# AWS Phase 4 — Five-Dimension Applicability Engine

## Question

Before AWS asks whether conduct was permitted, restricted, or prohibited, it must ask:

> **Does this legal basis actually apply?**

## Five dimensions

```text
TEMPORAL
TERRITORIAL
PERSONAL
SUBJECT MATTER
JURISDICTION
```

Each dimension returns one of:

```text
APPLIES
DOES_NOT_APPLY
PARTIAL
UNCERTAIN
```

## Overall decision table

| Dimension state present | Overall result |
|---|---|
| any `DOES_NOT_APPLY` | `NOT_APPLICABLE` |
| otherwise any `UNCERTAIN` | `UNCERTAIN` |
| otherwise any `PARTIAL` | `PARTIALLY_APPLICABLE` |
| all `APPLIES` | `APPLICABLE` |

The evaluator is pure and deterministic.

## Treaty-party helper

Binding participation actions are currently:

```text
ratification
accession
acceptance
approval
succession
```

A signature alone does **not** satisfy binding-party status.

```text
SIGNATURE != RATIFICATION
```

No participation record produces `UNCERTAIN`, not a fabricated conclusion.

## Jurisdiction helper

A court name plus a treaty reference is not enough.

The engine separates:

```text
FORUM
+
JURISDICTIONAL BASIS
+
CONSENT / COMPETENCE
+
RESERVATION CONFLICT
+
AUTHORITATIVE RESOLUTION
```

A contested reservation without authoritative resolution remains `UNCERTAIN`.

A final authority that expressly affirms or denies jurisdiction can resolve that dimension for the specific dispute.

## Critical separation

```text
APPLICABLE
    !=
MERITS PROVEN
    !=
PERMITTED / PROHIBITED
    !=
MIZAN
```

The applicability engine never emits a Mizan result.
