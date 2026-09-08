import {
  createCosmicEngine,
  toCosmicSemanticObservation,
  type CosmicEngineConfig,
} from '@moonwitness/cosmic-engine';

export * from '@moonwitness/cosmic-engine';

export type AwsEngineConfig = CosmicEngineConfig;
export type AwsEngine = Awaited<ReturnType<typeof createCosmicEngine>>;
export type AwsSemanticObservationStatus = 'AVAILABLE' | 'UNAVAILABLE';

export interface AwsSemanticObservation {
  protocol: 'AWS_SEMANTIC_OBSERVATION_V1';
  status: AwsSemanticObservationStatus;
  metadata: {
    provider: string;
    configurationFingerprint: string;
    capabilities: string[];
  };
  candidates: Array<{
    label: string;
    kind: 'ENTITY' | 'EVENT' | 'ACTION' | 'CLAIM' | 'SOURCE_HINT';
    confidence?: number;
    evidenceHints?: string[];
  }>;
  intentionSignals: string[];
  diagnostics: string[];
}

export async function createAwsEngine(configOrRoot: string | AwsEngineConfig = process.cwd()): Promise<AwsEngine> {
  return createCosmicEngine(configOrRoot);
}

export function toAwsSemanticObservation(raw: Record<string, unknown>): AwsSemanticObservation {
  const legacy = toCosmicSemanticObservation(raw);
  return {
    ...legacy,
    protocol: 'AWS_SEMANTIC_OBSERVATION_V1',
    metadata: {
      ...legacy.metadata,
      provider: legacy.metadata.provider.replace(/^cosmic-/, 'aws-'),
      configurationFingerprint: legacy.metadata.configurationFingerprint.replace(/^cosmic-/, 'aws-'),
    },
  };
}
