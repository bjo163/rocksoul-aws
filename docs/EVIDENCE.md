# Universe OS — Evidence & Provenance

Every substantive result should be classifiable as one of:

```text
QURAN_EXPLICIT
TEXTUAL_WITNESS_CORROBORATION
HISTORICAL_REPORT
RESEARCH_DATASET
OBSERVED
INFERRED
ENGINE_DERIVED
AI_INFERENCE
UNKNOWN
CONFLICTED
```

Each evidence item should retain:

```text
source
reference
content hash (when available)
provenance
confidence
status
version
```

## Source separation

The Qur'an is kept as the primary Qur'anic knowledge source. Prior-scripture references are maintained separately from later textual witnesses. Historical reports and research datasets never overwrite Qur'anic source status.

## Mizan trace

Mizan results should be explainable through the contributing semantic/vector/evidence inputs. A score is not sufficient without a trace.

## Persistence boundary

Evidence records are versioned persistent records with actor and timestamp metadata. The evidence payload, provenance references, and confidence are preserved with the related case and included in audit history; they remain decision-support information, not an authoritative legal or divine determination.

## v4.20 report/evidence rule

A natural-language case description is a **report to analyze**, not proof that the described event occurred. Unless case evidence is marked verified/corroborated, action findings remain `PROVISIONAL` even when the semantic action and relevant Qur'anic principle are clear. This prevents source authority (a Qur'an reference) from being confused with factual proof about a particular accused person.


## v4.21 Four-book Revelation Core

Normative reasoning is restricted to Al-Qur'an, Tawrat, Zabur, and Injil, with Al-Qur'an primary/Muhaimin. External research and historical metadata cannot contribute normative weight. The engine distinguishes scripture text from metadata and distinguishes a place mentioned in a passage from the place where that passage was revealed. Tawrat/Zabur/Injil transmitted textual-witness corpora are now bundled and seeded for corroboration only; they are not equated with the original revealed texts and cannot establish or reverse primary moral direction. See `REVELATION_SEMANTIC_CORE.md`.

## v4.22 Asma evidence rule

An Asma candidate is evidence-backed only by its scripture occurrences. Repetition raises surface corroboration but does not automatically turn a phrase into a canonical Name. Explicit Divine relations retain the exact ayah and original Arabic text. External name lists, dictionaries, tafsir and web material cannot supply normative weight to the Asma Engine.

## v4.23 corroboration evidence

`TEXTUAL_WITNESS_CORROBORATION` is confidence-only evidence. A transmitted Tawrat/Zabur/Injil witness must keep its edition/source/hash provenance and `originalRevelationEquated=false`. A match is not a claim that the extant text equals the original revelation. Single-word lexical matches are rejected by the current corroborator to reduce false positives.

## v4.25 binding provenance rule

A language alias/query surface is not evidence. Evidence begins at the retrieved admitted-Revelation passage. `pureRevelationDerived=true` therefore means the **normative direction after language parsing** is derived from retrieved Revelation structure; it does not mean the software's language parser is revelation. Missing empirical facts remain unresolved.


## v4.27 event-occurrence evidence rule

An action word inside a sentence is not automatically an occurred event. The Semantic Event Interpreter distinguishes occurred, negated, reported/embedded, and context-invalidated actions before Revelation binding. A report such as “Dia dituduh mencuri tanpa bukti” does not establish theft by the accused; the reported theft clause is suppressed as an occurrence while the unsupported-accusation event may be analyzed separately. Permission, mistake, coercion and restoration remain explicit context/evidence fields rather than hidden score modifiers. Event parsing has `normativeAuthority=false`; moral evidence still begins at admitted Revelation passages.

## v4.28 Lifecycle evidence

Lifecycle language signals are evidence about what a speaker/report says happened, not proof of hidden sincerity. Quran lifecycle references are discovered from runtime corpus queries. Tawrat/Zabur/Injil textual-witness matches may raise grounding confidence only. A declaration of repentance, regret or apology never proves acceptance by Allah.

## v4.29 Grammar evidence

Grammar structure is secondary analytical evidence attached to exact Qur'an passage provenance. A grammar frame cannot create Revelation authority. Negation/polarity must survive into downstream Asma/Moral relations. Candidate condition/cause/root fields must remain labelled as candidates.


## v4.30 ontology evidence rule

Ontology strength is provenance-first: exact ayah relations outrank context clustering. Repetition can corroborate a surface concept; corpus-context similarity can organize discovery; neither may create a canonical Divine Name or normative rule. Relation-family polarity must remain visible (`LOVES` versus `DOES_NOT_LOVE`, etc.) and may not be flattened into a single positive label.
