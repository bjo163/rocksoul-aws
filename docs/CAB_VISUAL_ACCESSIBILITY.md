# CAB Universe Visual / Accessibility Contract — M5–M7

## M5 — Keyboard and accessibility

Universe drill-down controls are native buttons with explicit `type`, `aria-label`, and `aria-pressed` state. Repeating content uses list semantics, and major operator regions use labelled sections.

The contract must remain keyboard-operable without relying on pointer-only interactions.

## M6 — Localization parity

Universe-specific operator copy lives in paired dictionaries:

- `apps/cab/src/locales/universe-en.json`
- `apps/cab/src/locales/universe-id.json`

`UniverseDrilldown` selects the dictionary from the active CAB locale and receives the locale from `Observatory`. Backend enum/status values remain canonical machine values and are not translated implicitly.

## M7 — Visual certification baseline

The stable visual contract is:

```text
OBSERVATORY
 ├── Operational base
 ├── Event → Passage
 ├── Prophet Profile
 ├── Event/Profile Detail
 └── Review · Witness · Audit
```

Visual regression should assert structure and semantics rather than exact pixel output. Snapshot updates require intentional review because the Observatory is a governed operator surface.

## Boundary

Accessibility and localization are projection concerns. They must not create new semantic meaning, alter epistemic lanes, or introduce a new API family.
