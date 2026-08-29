# Intelligence engine

`@moonwitness/intelligence` exposes `createIntelligenceEngine`, `EngineContext`, `EngineCapability`, `EngineBundle`, `defineBundle`, `createBundle`, and `mergeBundles`. Capabilities are independently registerable and do not require the engine. Bundles declaratively combine capabilities and workflows:

```ts
const engine = createIntelligenceEngine({ workflows: [workflow] });
engine.useBundle(researchBundle);
await engine.analyze({ text: '...' });
```

The context contains only a clock, logger, registries, and metadata. It contains no HTTP request, Fastify, filesystem, database client, or environment loader.
