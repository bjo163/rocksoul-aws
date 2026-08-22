# Universe OS — Revelation & Reminder Patterns

## Source model

The engine separates three related but different concepts:

```text
REVELATION ORDER
→ chronology metadata

QURAN NARRATIVE PATTERN
→ thematic/story structures found in the Qur'an

REVELATION CONTEXT
→ Asbāb al-Nuzūl / historical reports with provenance
```

A ruku/section is treated as a structural/thematic candidate, not automatically as an occasion of revelation.

## Reminder bundle

A reminder can be composed from:

- one Qur'an passage selection,
- two Asma registry entries,
- one prior-scripture reference metadata item,
- one Qur'an-grounded temporal context,

subject to source availability and provenance rules.

The engine does not invent a maximum number of verses per revelation event. Any distribution used for simulation is explicitly labelled `SIMULATION_ONLY`.

## Temporal patterns

The temporal registry may represent explicit/derived/unknown windows such as dawn, night, Jumu'ah, lunar phases, Ramadan, and special-night references when supported by source data.

`UNKNOWN` means the system does not manufacture a time prediction.

## API boundary

Reminder ingress endpoints require analysis permission. Generated schedules and triggered reminders are explicitly model events: they preserve source references and provenance but do not claim to predict revelation timing, unseen outcomes, or divine authority.
