# Configuration policy

YAML is reserved for human-edited operational configuration and policy.

Semantic knowledge, evidence, Quran/Asma datasets, and machine-stable registries remain JSON.
Source code remains TypeScript.

Do not place case-specific classifiers in YAML or TypeScript. Case meaning must come from semantic observations and evidence.

Configuration validation is part of `npm run validate`; YAML files must have a numeric `version` field and must not use tab indentation.
