# MoonWitness Repository Structure — v4.32

The repository is moving from a large `src/` tree toward explicit workspace package boundaries.

## Packages

```text
packages/
├─ contracts/      # shared wire/domain contracts
├─ kernel/         # Entity/Event/State/Relation + Model Registry boundary
├─ revelation/     # Revelation, Asma, ontology, grammar, binding, prophetic relations
├─ persistence/    # SQLite/PostgreSQL/file persistence providers and repositories
├─ data-access/    # actor-aware data access over persistence
├─ sdk/            # HTTP/application SDK contracts
└─ ui/             # shared governed UI primitives
```

`kernel` and `revelation` are introduced in v4.32 as compatibility façades. Their mature implementation modules remain under `src/` until each dependency edge is migrated and certified.

## Applications

```text
apps/
├─ api/            # Universal API / runtime adapter
├─ cab/            # MoonWitness Control & Audit Board
├─ xrp/            # RID-scoped user/workspace experience
├─ web/            # public web surface
└─ flow/           # workflow definition surface; currently not the product priority
```

Applications may compose packages but must not duplicate kernel, persistence, Revelation, or contract logic.

## Data

`data/` is classified by purpose, not by arbitrary engine ownership:

```text
data/
├─ divine-books/   # admitted revelation corpora and textual-witness corpora
├─ knowledge/      # knowledge bridges, scripture references, prophetic events, research data
├─ revelation/    # revelation research / derived reporting inputs
├─ identity/       # identity/RID seed data
├─ governance/     # governance reference data
├─ master-data/    # stable reference/master data
├─ seed/           # installer seed manifests and seed control metadata
├─ runtime/        # generated runtime state; never source-controlled as canonical seed
└─ backups/        # generated backup material; never treated as source-of-truth
```

A JSON file under `data/` is not automatically canonical. Its role must be one of:

- `STRUCTURED SEED`: typed entity/relation/event source intended for installation
- `CORPUS`: admitted source corpus
- `RESEARCH`: non-normative research/hypothesis data
- `DERIVED`: reproducible engine output or index
- `SNAPSHOT`: opaque dataset capture; not a domain object by itself
- `RUNTIME/BACKUP`: generated operational data

## Prophet / Revelation data

Prophet information is intentionally relational:

```text
REVELATION.PROPHET_PROFILE
        │
        ├── KNOWLEDGE.SCRIPTURE_REFERENCE
        │       └── QURAN passage
        │
        └── KNOWLEDGE.PROPHETIC_EVENT
                └── QURAN references
```

The profile, scripture-reference index, and prophetic-event dataset are seeded into PostgreSQL as typed records. Unsupported biography or chronology belongs in a derived/unresolved lane, not the core Revelation graph.

## Migration rule

Do not mass-move directories merely to make the tree look clean. A module moves into a package only when:

1. its dependency boundary is explicit;
2. application imports can use the package entrypoint;
3. no runtime path depends on the old location;
4. tests/CI cover the new boundary; and
5. the old implementation path can be removed without compatibility shims.

This keeps refactoring architectural rather than cosmetic.
