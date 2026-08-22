# Human Review & Explainability Gate — v4.32

The Human Review Gate sits after semantic interpretation, Revelation binding,
and Qur'anic Mizan analysis. It makes the safety decision explicit at the
boundary consumed by API and UI clients.

```text
EVENT / EVIDENCE
      ↓
REVELATION + MIZAN ANALYSIS
      ↓
HUMAN REVIEW GATE
      ├─ ALLOW_ANALYTICAL_DISPLAY
      ├─ REQUIRE_HUMAN_REVIEW
      └─ BLOCK_ADVERSE_ACTION
```

Analytical display is always allowed as a transparent model result, while
adverse action is always blocked by this gate. `ALLOW_ANALYTICAL_DISPLAY` means
that no additional review blocker was detected for displaying the analytical
result; it never authorizes punishment, accusation, denial of rights, or a
claim about Allah's final judgement.

The gate exposes:

- `decision`, `severity`, and `requiresHumanReview`;
- machine-readable `reasons` with supporting references;
- `evidenceGap` items that explain what is missing;
- `recommendedReviewActions` for the next safe human step;
- an explicit epistemic boundary.

`ACTUAL_CONFLICT` and `RESERVED` outcomes use `BLOCK_ADVERSE_ACTION` and
`CRITICAL` severity. Unverified reports, provisional findings, missing
grounding, and required empirical bridges use `REQUIRE_HUMAN_REVIEW`.

The contract is defined in `schemas/human-review-gate.schema.json` and is
returned as `reviewGate` in analysis responses.
