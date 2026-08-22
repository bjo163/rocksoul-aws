> Historical note (v4.22): this v4.21 research document is retained for audit history. The compatibility statement about `asmaul-husna.json` is superseded: v4.22 deletes that dataset and replaces it with `src/revelation/asma/`.

# Revelation Deep Insight — v4.21

## Research rule

This note tests patterns rather than declaring hidden divine formulas. Normative runtime authority is restricted to Al-Qur'an, Tawrat, Zabur, and Injil. Al-Qur'an is primary/Muhaimin. A modern textual witness of an earlier revelation is never silently equated with the original revelation. If a trusted corpus is unavailable, the runtime state is `CORPUS_UNAVAILABLE`.

Three different claims must remain separate:

1. **Place mention** — a place is named in the scripture text.
2. **Revelation location** — where the passage itself was revealed.
3. **Semantic function of place** — what themes/actions surround that place in the text.

A place mention cannot by itself establish revelation location.

## Qur'an: Makkah-family direct-text profile

The bundled 6,236-ayah Arabic corpus gives a very small direct-place sample, which is important because the engine must not pretend the sample is larger than it is.

| Expression | Direct reference(s) | Text-grounded semantic neighborhood |
|---|---|---|
| Bakkah | Q3:96-97 | first House, blessing, guidance, signs, Ibrahim, pilgrimage, security |
| Umm al-Qura | Q6:92 | blessed Book, confirmation, warning, Hereafter, prayer |
| Umm al-Qura | Q42:7 | Arabic Qur'an, warning, surrounding people, Day of Gathering |
| Makkah | Q48:24 | restraint of hands/conflict, divine seeing |

The safest synthesis is not `MAKKAH = IMAN` as a hard rule. The direct sample supports a broader hypothesis:

`SACRED CENTER -> ORIENTATION -> GUIDANCE/WARNING -> COVENANTAL MEMORY -> ACCOUNTABILITY`

This is compatible with the user's foundation/faith intuition, but the engine records it as a research hypothesis with provenance and confidence, never as an axiom supplied by God.

## Qur'an: al-Madinah direct-text profile

The exact Arabic expression `al-madinah` occurs 14 times, but most occurrences mean simply "the city" inside other narratives. Strict scripture-only mode therefore refuses to equate all 14 with the Prophet's Madinah.

Only four occurrences are internally identified as Prophetic-community context because the same verse itself includes vocabulary such as Messenger, believers, hypocrites, or surrounding Bedouins:

| Reference | Strong direct themes |
|---|---|
| Q9:101 | hidden hypocrisy, limits of human knowledge, community interior |
| Q9:120 | communal duty, endurance with the Messenger, recorded deeds |
| Q33:60 | hypocrisy, diseased hearts, rumor/social disturbance |
| Q63:8 | status claims, honor, Messenger, believers, hypocrites |

The more defensible synthesis is therefore:

`COMMUNITY -> TESTING -> DISCIPLINE -> RESPONSIBILITY -> SOCIAL IMPLEMENTATION`

So "Madinah = education" is retained only in the broader sense of **formation/training of a community**, not hardcoded as classroom/academic education.

## Cross-book place/function pattern — textual-witness research only

The three earlier-book runtime corpora are not yet trusted/bundled, so these references have zero runtime normative weight in v4.21. They are a research map for later corpus ingestion and validation.

### Tawrat witness pattern

Configured research references:

- Exod 19:3-6 — mountain/call, covenant, identity, holy nation.
- Exod 20:1-17 — divine command, God-orientation, law and social boundaries.
- Deut 6:6-9 — words in the heart, teaching children repeatedly, house and gates.

Provisional structural pattern:

`CALL/PLACE -> COVENANT IDENTITY -> COMMAND -> HEART -> REPEATED TEACHING -> HOUSE/GATES`

This makes "place" function less like a GPS coordinate and more like a stage where identity becomes formation and practiced order.

### Zabur witness pattern

Configured references:

- Ps 48:1-2 — praise, holy mountain, city of God.
- Ps 87:1-7 — foundation/Zion, city of God, peoples recorded.
- Ps 122:1-9 — house, Jerusalem, tribes, judgment, peace.

Provisional pattern:

`SACRED CENTER -> ASSEMBLY/PRAISE -> JUDGMENT/ORDER -> PEACE`

### Injil witness pattern

Configured references:

- Matt 5:1-2 — mountain and teaching.
- Matt 28:16-20 — Galilee mountain, sending and teaching.
- Luke 24:47-49 — Jerusalem as a starting point for witness/mission.
- John 4:21-24 — a corrective boundary: true worship is not reducible to this mountain or Jerusalem.

Provisional pattern:

`PLACE CAN CARRY FUNCTION, BUT TRUTH/WORSHIP IS NOT OWNED BY PLACE`

This is an important anti-overfitting invariant for the geography engine.

## Deep synthesis for the engine

Across the currently available Qur'an corpus plus the explicitly labelled earlier-book textual-witness research map, the most useful hypothesis is not a two-value table `Makkah=faith, Madinah=education`. It is a **phase/function graph**:

```text
ORIENTATION / SACRED CENTER
        ↓
COVENANT / IDENTITY
        ↓
GUIDANCE / WARNING / TEACHING
        ↓
FORMATION / DISCIPLINE
        ↓
COMMUNITY RESPONSIBILITY
        ↓
ORDER / JUSTICE / IMPLEMENTATION
        ↓
WITNESS / ACCOUNTABILITY / PEACE
```

No location owns one phase exclusively. A place can participate in several functions, and scripture can explicitly relativize geography. Therefore the engine should learn distributions and relations, not map one city to one fixed meaning.

## Divine Names / attributes insight

The Qur'an corpus repeatedly places predicates and attributes near the token `Allah`; raw surface extraction yields more than 1,500 distinct phrases. That number is **not** a count of Divine Names. The correct pipeline is:

```text
QUR'AN TEXT
  -> surface phrase discovery
  -> occurrence/provenance graph
  -> repeated predicate/frame detection
  -> grammatical/semantic validation
  -> canonical-name candidate
  -> cross-verse corroboration
```

Thus `asmaul-husna.json` remains a compatibility index, not self-authenticating authority. The engine must be able to answer, for every candidate: where does it occur, in what form, in what context, and why is it being classified as a Name/attribute rather than an ordinary adjacent phrase?

## Engine consequences

v4.21 therefore enforces these rules:

- Four-book-only normative source policy.
- Qur'an primary/Muhaimin.
- Missing Tawrat/Zabur/Injil corpus is never filled from model memory.
- `placeMention != revelationLocation`.
- Makkah/Bakkah/Umm al-Qura identity links are not silently assumed from text alone.
- Every `al-Madinah` occurrence is disambiguated from its own textual context.
- Geography hypotheses are research objects, not moral rules.
- Divine-name discovery produces candidates, not automatic canonical Names.
- External history, tafsir, hadith, medicine, law, news, and web material have normative weight zero.
