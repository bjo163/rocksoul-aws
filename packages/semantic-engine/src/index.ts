import { readFile } from 'node:fs/promises';
import path from 'node:path';

export type SemanticKey = string | number;
export type SemanticMode = 'REFLECTION' | 'DEVIATION' | string;

export interface BuildSemanticVectorInput {
  primary?: SemanticKey[];
  secondary?: SemanticKey[];
  relevance?: Record<string, number>;
  mode?: SemanticMode;
}

export interface SemanticVectorAttribute {
  id: string;
  primary: boolean;
  weight: number;
  scaleBias: Record<string, unknown>;
  source: 'ENGINEERING_SEMANTIC_SIGNAL';
}

export interface AnalyticalSemanticVector {
  primary: string[];
  secondary: string[];
  weights: Record<string, number>;
  attributes: SemanticVectorAttribute[];
  mode: SemanticMode;
  semanticReady: boolean;
  normativeAuthority: false;
}

/**
 * Build a deterministic, non-normative semantic signal vector.
 * This is an engineering signal only; it does not infer Revelation authority.
 */
export function buildAnalyticalSemanticVector({
  primary = [],
  secondary = [],
  relevance = {},
  mode = 'REFLECTION',
}: BuildSemanticVectorInput = {}): AnalyticalSemanticVector {
  const primaryKeys = primary.map(String);
  const secondaryKeys = secondary.map(String);
  const keys = [...new Set([...primaryKeys, ...secondaryKeys])];
  const weights: Record<string, number> = {};
  const attributes = keys.map((key) => {
    const isPrimary = primaryKeys.includes(key);
    const secondaryIndex = secondaryKeys.indexOf(key);
    const rank = isPrimary ? 1 : Math.max(0.15, 0.85 - secondaryIndex * 0.12);
    const contextualValue = Number(relevance[key]);
    const contextual = Number.isFinite(contextualValue) ? contextualValue : 0.7;
    const weight = Number(Math.max(0, Math.min(1, rank * contextual)).toFixed(6));
    weights[key] = weight;
    return {
      id: key,
      primary: isPrimary,
      weight,
      scaleBias: {},
      source: 'ENGINEERING_SEMANTIC_SIGNAL' as const,
    };
  });

  return {
    primary: primaryKeys,
    secondary: secondaryKeys,
    weights,
    attributes,
    mode,
    semanticReady: attributes.length > 0,
    normativeAuthority: false,
  };
}

export interface SemanticDefinition {
  id: string;
  label: string;
  evidence_refs?: string[];
  source_note?: string;
  version?: string;
  [key: string]: unknown;
}

export interface SemanticRegistrySnapshot {
  version: string;
  definitions: Record<string, SemanticDefinition>;
  loadedAt: string;
}

/** In-memory semantic definition registry with an optional JSON-file loader. */
export class SemanticRegistry {
  private snapshotData: SemanticRegistrySnapshot;

  constructor(definitions: Record<string, SemanticDefinition> = {}) {
    this.snapshotData = {
      version: '1.0.0',
      definitions,
      loadedAt: new Date().toISOString(),
    };
  }

  static async fromFile(filePath: string): Promise<SemanticRegistry> {
    try {
      const raw = JSON.parse(await readFile(path.resolve(filePath), 'utf8')) as unknown;
      const data = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
      const definitions = data.definitions && typeof data.definitions === 'object'
        ? data.definitions as Record<string, SemanticDefinition>
        : {};
      const registry = new SemanticRegistry(definitions);
      registry.snapshotData = {
        version: typeof data.version === 'string' ? data.version : '1.0.0',
        definitions,
        loadedAt: new Date().toISOString(),
      };
      return registry;
    } catch {
      return new SemanticRegistry();
    }
  }

  get(id: string): SemanticDefinition | null {
    return this.snapshotData.definitions[id] ?? null;
  }

  all(): SemanticDefinition[] {
    return Object.values(this.snapshotData.definitions).map((item) => ({ ...item }));
  }

  snapshot(): SemanticRegistrySnapshot {
    return structuredClone(this.snapshotData);
  }
}
