# Native Revelation Binding — v4.25

## Purpose

v4.25 removes the manual **action → verse** table from normative grounding. The system keeps a language adapter because user language must still be parsed, but the adapter has zero normative authority.

## Boundary

```text
Language Adapter
  may: identify a concept, form Arabic corpus-search surfaces, form witness query phrases
  may not: name a verse, set POSITIVE/NEGATIVE, assign a moral score

Revelation Binder
  scans admitted runtime corpus
  retrieves matching passages
  checks focus / directive / consequence structure
  derives conditional moral direction from passage evidence
```

The canonical profile is `data/revelation/language-concept-anchors.json`. Tests reject embedded Qur'an references or moral-score fields.

## Pipeline

```text
Indonesian/user text
   ↓
non-normative action/language recognition
   ↓
query profile (no verse refs, no direction)
   ↓
full Qur'an corpus retrieval
   ↓
focus-aware passage analysis
   ↓
Revelation Moral Graph / structural direction
   ↓
Qur'an conditional direction
   ↓
Tawrat/Zabur/Injil corroboration (confidence only)
   ↓
RGBL / Mizan / scoring
```

Qur'an is primary/Muhaimin. The three local transmitted textual witnesses never vote on direction and never reverse Qur'an. Their combined confidence boost is capped at 0.30.

## Purity definition

`pureRevelationDerived=true` means **the normative direction, after a non-normative language query has been formed, is derived from retrieved admitted-Revelation passage structure**. It does not claim that translation, tokenization, aliases, or software inference are revelation.

## Scoring

Two different numerical products are exposed:

1. `revelationAlignmentScore` — signed Revelation direction × software binding/corroboration confidence. It represents alignment/grounding confidence, not moral severity, reward, punishment, or Hisab.
2. `analyticalScore` — compatibility score using engineering impact/RGBL magnitude. It remains explicitly non-pure and non-normative.

v4.26 replaces the action-specific magnitude source with Revelation-grounded structural inputs. The numerical combination itself remains an engineering formula and is therefore still non-normative; it is versioned in `data/revelation/scoring-profile.json` rather than being mislabeled as revealed magnitude.

## Unresolved behavior

When the scriptures do not establish the factual bridge required by a modern action, the result must remain `UNRESOLVED`. The canonical example is tobacco smoking: the language action is recognized, but the four-Revelation-only core does not invent medical facts, so no Revelation moral score is emitted.

## Install contract

The language profile is a required seeded runtime dataset. `REVELATION-INDEX::NATIVE-BINDING` stores its SHA-256 together with the current corpus fingerprint. `npm run revelation:install-verify` rechecks both and reruns the 10-case smoke matrix.


## v4.26 downstream scoring

Native binding now feeds `src/revelation/scoring/revelation-magnitude.ts`. The scoring layer cannot change the binding direction. It measures structural strength from explicit directive/consequence markers, explicit Moral Graph relations, repeated retrieved references, coverage and native-binding confidence. OUT relevance is restricted to a local passage window around the matched action anchors.

## v4.27 event-graph front end

Native Binding is now invoked event-by-event from `src/events/`. The Event Interpreter may split one user sentence into multiple occurred/reported/negated/context-invalidated events, but it has zero normative authority. A composite event preserves the union of event-level Revelation provenance; opposing directions become an explicit mixed/conflict state rather than a forced net Revelation score. Four-book corroboration is now keyed to binding query phrases rather than arbitrary user-text tokens.
