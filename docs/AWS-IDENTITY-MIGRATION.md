# AWS Identity Migration

## **NEW NAME. SAME EVIDENCE CHAIN. LESS DRIFT.**

> **/// CANONICAL IDENTITY CONTRACT ///**

AWS is the canonical legal-research identity in this repository. Legacy **Cosmic** identifiers may remain only where removing them would break an existing consumer, persisted resource, or historical audit trail.

## Canonical mapping

| Surface | Canonical | Legacy compatibility |
|---|---|---|
| Repository | `rocksoul-aws` | — |
| Root package | `rocksoul-aws` | `moonwitness-os` retired |
| Engine facade | `@moonwitness/aws-engine` | `@moonwitness/cosmic-engine` deprecated |
| Engine factory | `createAwsEngine()` | `createCosmicEngine()` compatibility export |
| Semantic protocol | `AWS_SEMANTIC_OBSERVATION_V1` | `COSMIC_SEMANTIC_OBSERVATION_V1` legacy |
| Fastify runtime flag | `AWS_FASTIFY_RUNTIME` | `COSMIC_FASTIFY_RUNTIME` fallback |
| Fastify dependency port | `app.aws` | `app.cosmic` deprecated alias |
| CI workflow identity | `AWS CI` | old Cosmic workflow names retired |
| Release evidence | `aws-release-evidence-<sha>` | old artifact names historical only |
| Container image | `rocksoul-aws:<sha>` | old `cosmic:<sha>` retired |

## Compatibility rule

```text
NEW CODE
   ↓
AWS NAME ONLY

LEGACY CONSUMER
   ↓
EXPLICIT COMPATIBILITY BRIDGE
   ↓
DEPRECATION TEST
   ↓
MIGRATION
   ↓
REMOVE ONLY WHEN SAFE
```

Do not introduce new `Cosmic`, `COSMIC_*`, `cosmic-*`, or `cosmic:*` identifiers unless the change is specifically implementing or testing a documented legacy bridge.

## Data-preservation exception

Existing Docker volumes, persistent stores, audit records, historical protocol payloads, or external clients may still contain old identifiers. Rename them only with an explicit migration path. A cosmetic rename must never orphan production data or invalidate an audit chain.

## Product boundary

MoonWitness remains the umbrella namespace and research organization.

```text
MOONWITNESS
└── ROCKSOUL RESEARCH
    ├── STORY  → MFTL
    ├── EVENT  → LEGEND
    ├── PERSON → SUPERHERO
    ├── RGBL   → TEXT / PROVENANCE
    └── AWS    → LAW / APPLICABILITY
```

AWS owns legal research and legal-analysis contracts. UI/design remains outside this repository.
