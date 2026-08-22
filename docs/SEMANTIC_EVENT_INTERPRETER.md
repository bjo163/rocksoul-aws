# Semantic Event Interpreter — v4.27

## Purpose

The Event Interpreter sits **before** Revelation moral binding. It answers a different question from Mizan:

> What event(s) are actually being described, in what order, with what knowledge/context signals?

It has **zero normative authority**. It may parse language, sequence, negation, reports, permission, mistake, coercion, ownership clues and restoration. It may not create a Qur'an reference, moral direction, sin/reward quantity, or divine verdict.

## Runtime pipeline

```text
USER TEXT
  ↓
SEMANTIC EVENT PARSER
  ├─ actor / patient / object / owner clues
  ├─ action candidates
  ├─ negation
  ├─ reported vs asserted event
  ├─ knowledge / belief / update
  ├─ mistake / coercion / permission / capacity
  ├─ purpose signal
  └─ event sequence
  ↓
EVENT GRAPH
  ↓
EVENT-BY-EVENT NATIVE REVELATION BINDING
  ↓
EVENT CONFLICT / LIFECYCLE RESOLUTION
  ↓
RGBL + 13 OUT + MIZAN
```

The canonical language profile is `data/events/event-language-profile.json`. It is seeded as runtime data, has `normativeAuthority=false`, and its SHA-256 is pinned by `REVELATION-INDEX::EVENT-INTERPRETER`.

## Core invariants

1. **Negation is not occurrence.** `Saya tidak mencuri` must not be processed as an occurred theft.
2. **A reported claim is not an established event.** `Dia dituduh mencuri` must not turn the accused person into a confirmed thief.
3. **Permission changes event identity.** A generic property-taking phrase with explicit owner permission must not be promoted to theft merely because words overlap.
4. **Mistake is context, not hidden-heart knowledge.** Structural property-taking inferred from a mistake can be invalidated as a theft label; explicit contradictory wording is preserved for review rather than silently rewritten.
5. **Coercion does not erase the described act.** It is preserved as responsibility context and attenuates the software accountability channel; the factor is engineering, not divine accounting.
6. **Restoration does not erase history.** `mencuri → mengembalikan` produces a historical violation plus a later restoration event.
7. **Opposing principles are not arithmetically forced into a verdict.** When one event simultaneously binds to positive and negative Revelation relations, the state becomes `PRINCIPLE_CONFLICT` and aggregate Revelation score is not forced.

## Event states

- `ASSERTED` — the text presents an event as occurring.
- `REPORTED` — the text reports/attributes an event and requires epistemic caution.
- `NEGATED` — the action surface is explicitly negated.
- `CONTEXT_INVALIDATED` — a candidate action label is contradicted by language context such as permission, mistake, or embedded reported content.
- `UNRESOLVED` — the parser cannot safely establish an event action.

Conflict resolution is exposed separately as `conflictResolution`:

- `NONE` — no opposing Revelation-grounded directions were found.
- `SEQUENCE_RESOLVED` — opposing directions belong to distinct ordered events;
  channels remain separate and no arithmetic net is produced.
- `ACTUAL_CONFLICT` — one occurred event has opposing directions; this blocks an
  `ESTABLISHED` Mizan finding and requires human review.
- `INSUFFICIENT_EVIDENCE` — there is not enough grounded event evidence to make
  a conflict determination.

The resolver never applies a normative priority between sides. `blockingMizan`
is a safety gate for software certainty, not a claim about divine judgement.

Aggregate interpretation states:

- `POSITIVE`
- `NEGATIVE`
- `MIXED_SEQUENCE`
- `VIOLATION_WITH_RESTORATION`
- `PRINCIPLE_CONFLICT`
- `UNRESOLVED`

## Examples

### Negation

```text
Saya tidak mencuri barang itu.
```

Expected event state: `NEGATED`; Revelation direction: `UNRESOLVED` for an occurred act.

### Permission

```text
Saya mengambil barang milik orang lain dengan izin pemilik.
```

The property-taking surface is present, but the inferred theft label is `CONTEXT_INVALIDATED`; the engine must not manufacture a theft verdict.

### Reported accusation

```text
Dia dituduh mencuri tanpa bukti.
```

The embedded `mencuri` action is suppressed as reported claim content. The event being analyzed is the unsupported accusation, with the accused represented as patient/target rather than the offender.

### Violation followed by restoration

```text
Saya mencuri dompet lalu mengembalikannya kepada pemilik.
```

The graph retains two events. Aggregate state: `VIOLATION_WITH_RESTORATION`. Red and Light/Green channels remain separately visible; they are not cancelled into zero.

### Principle conflict

```text
Saya berbohong agar membantu teman.
```

The same event may retrieve a negative false-speech relation and a positive helping relation. Aggregate state: `PRINCIPLE_CONFLICT`; the engine exposes both sides and does not invent a Revelation priority that it has not established.

## Testing

`npm run test:event` runs parser invariants plus the canonical **100-case adversarial suite**. The suite covers ten groups: direct theft, negation, violation+restoration, mistake+return, permission, lying, same-event principle conflict, unsupported accusation, verification, and helping.

Passing this suite demonstrates software behavior for those test classes. It does **not** establish exhaustive moral knowledge or reproduce Allah's judgement.
