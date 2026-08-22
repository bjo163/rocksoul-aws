import { readFile } from 'node:fs/promises';
import path from 'node:path';

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

export class SemanticRegistry {
  private snapshotData: SemanticRegistrySnapshot;

  constructor(definitions: Record<string, SemanticDefinition> = {}) {
    this.snapshotData = { version: '1.0.0', definitions, loadedAt: new Date().toISOString() };
  }

  static async fromFile(filePath: string): Promise<SemanticRegistry> {
    try {
      const raw = JSON.parse(await readFile(path.resolve(filePath), 'utf8')) as unknown;
      const data = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
      const definitions = data.definitions && typeof data.definitions === 'object' ? data.definitions as Record<string, SemanticDefinition> : {};
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
