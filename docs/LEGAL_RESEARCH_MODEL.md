# AWS Legal Research Model

## Purpose

AWS is a provenance-first international-law and regulation research system. It reconstructs **what legal material exists, who it binds, when and where it applies, how it has been interpreted, which propositions are disputed, and what can responsibly be concluded from the available record**.

It does not treat search results, AI summaries, or the existence of a legal text as a final legal conclusion.

## Source families

International-law research must preserve the legal role of each source.

A useful starting taxonomy follows the source categories reflected in Article 38 of the Statute of the International Court of Justice:

- international conventions;
- international custom;
- general principles of law;
- judicial decisions and qualified scholarship as subsidiary means.

AWS stores the **source role** instead of flattening every citation into equivalent authority.

## Official-source priority

Preferred discovery and verification targets include:

| Family | Canonical target | Primary use |
|---|---|---|
| UN Treaty Collection | https://treaties.un.org/ | treaty text, depositary status, treaty actions, reservations/declarations |
| International Court of Justice | https://www.icj-cij.org/ | Statute, judgments, orders, advisory opinions |
| ICRC IHL Databases | https://ihl-databases.icrc.org/ | IHL treaties, States Parties, commentaries, customary IHL and national practice |
| OHCHR treaty systems | https://www.ohchr.org/ | human-rights instruments, treaty bodies, official documents and ratification context |
| ILO NORMLEX | https://normlex.ilo.org/ | international labour standards and ratification/status data |

Additional official systems may be added by domain modules, for example international criminal law, trade, maritime, aviation, environment, refugees, sanctions, anti-corruption, health, regional systems, or specialized tribunals.

## Authority is typed

Every legal source record should identify its role, such as:

```text
PRIMARY_TEXT
DEPOSITARY_STATUS
TREATY_ACTION
JUDGMENT
ORDER
ADVISORY_OPINION
OFFICIAL_INTERPRETATION
IMPLEMENTATION
STATE_POSITION
CUSTOMARY_PRACTICE
SCHOLARLY_ANALYSIS
COMMENTARY
DISCOVERY_ONLY
```

The role controls how the material may be used downstream.

## Required separations

### Instrument is not participation

A treaty text is one object. A State's signature, ratification, accession, reservation, declaration, denunciation, or withdrawal is another.

### Participation is not applicability

Even valid participation does not answer every temporal, territorial, personal, or subject-matter question.

### Applicability is not merits

A rule may apply while the facts remain disputed.

### Fact is not legal characterization

EVENT/PERSON evidence is imported by reference. AWS does not rewrite those records simply to support a preferred legal conclusion.

### Legal analysis is not Mizan

Mizan may weigh fairness, proportionality, harm, intent, responsibility, consistency, or other explicitly configured dimensions. That layer must preserve its legal inputs while remaining distinguishable from the legal result.

## Canonical research object families

```text
LEGAL INSTRUMENT
JURISDICTION
TREATY ACTION
LEGAL RULE / PROVISION
APPLICABILITY
LEGAL CLAIM
COUNTERCLAIM
AUTHORITY / SOURCE
EVIDENCE
PROVENANCE
LEGAL ASSESSMENT
MIZAN ASSESSMENT
RESEARCH REVISION
```

## Applicability matrix

Every case that reaches legal analysis should be able to answer:

| Dimension | Question |
|---|---|
| Temporal | Was the rule in force for the relevant time? |
| Territorial | Does the relevant territorial scope reach the conduct? |
| Personal | Were the relevant actors bound or otherwise covered? |
| Subject matter | Does the rule govern this type of conduct/dispute? |
| Jurisdiction / forum | Is a particular body competent to decide the question? |

Each dimension may be **applies**, **does not apply**, **partial**, or **uncertain**.

## Claims, not magic answers

AWS represents competing propositions explicitly:

```text
LEGAL CLAIM
  ├─ asserted proposition
  ├─ legal basis
  ├─ supporting authority
  ├─ supporting evidence
  ├─ contrary authority
  ├─ counterclaim
  ├─ scope
  └─ uncertainty
```

A conclusion must be reconstructable from these objects.

## Public legal-result vocabulary

```text
PERMITTED
RESTRICTED
PROHIBITED
DISPUTED
UNRESOLVED
```

These states are outputs of an explainable analysis. They are not intrinsic labels attached permanently to a person, State, religion, ethnicity, organization, or population.

## Provenance minimum

Canonical research should preserve at least:

- source URL or stable source identifier;
- issuing/publishing body;
- title or instrument identity;
- retrieved timestamp;
- source role;
- language;
- relevant date/version;
- checksum when a source artifact is captured;
- parser/extractor version when machine processed;
- researcher/reviewer state;
- supersession relation when replaced or corrected.

## Freshness

Legal truth is time-sensitive.

Treaty actions, corrections, new judgments, withdrawals, declarations, new official interpretations, and amended rules can change an analysis. AWS therefore treats **valid-time** and **research-time** as separate dimensions.

```text
VALID TIME     = when a rule/action legally operates
RESEARCH TIME  = when AWS learned or verified it
```

Historical records are never silently rewritten. New information creates a new provenance-bearing research state and triggers targeted re-analysis.

## AI boundary

AI may:

- discover candidate sources;
- extract candidate metadata;
- propose links;
- compare text;
- identify potential conflicts;
- draft candidate legal propositions;
- summarize competing arguments.

AI may not:

- fabricate a citation;
- promote a discovery snippet into canonical authority;
- infer ratification from signature;
- infer applicability from treaty existence;
- hide contrary authority;
- silently overwrite a reviewed record;
- generate a final legal/Mizan verdict outside configured review policy.
