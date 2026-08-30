# Bundles

An `EngineBundle` is a declarative package of independently reusable capabilities and workflow definitions. Consumers create one with `defineBundle` (or `createBundle`) and install it using `engine.useBundle(bundle)`. `mergeBundles` combines bundles while preserving their provenance in metadata. Bundle installation is explicit and does not mutate global registries.
