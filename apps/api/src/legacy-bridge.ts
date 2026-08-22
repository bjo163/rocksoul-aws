import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export interface BackendAppLike {
  createEntity(input: Record<string, unknown>): Promise<unknown>;
  updateEntity(entityId: string, updates: Record<string, unknown>): Promise<unknown>;
  deleteEntity(entityId: string): Promise<unknown>;
  createRelation(input: Record<string, unknown>): Promise<unknown>;
  recordEvent(input: Record<string, unknown>): Promise<unknown>;
  resolveRule(input: Record<string, unknown>): unknown;
  graph(entityId: string): unknown;
  health(): unknown;
}

export interface ModelRegistryLike {
  list(query?: Record<string, unknown>): unknown;
  get(typeId: string): unknown;
  define(input: Record<string, unknown>): unknown;
  pageModel(typeId: string): unknown;
}

export interface BackendRuntimeLike {
  graph: {
    snapshot(): unknown;
    integrity(): unknown;
    getEntity(id: string): unknown;
    listEntities(query?: Record<string, unknown>): unknown[];
  };
  ledger: {
    list(): unknown;
    verify(): unknown;
  };
  types: { list(): unknown };
  registerType(input: Record<string, unknown>): unknown;
}

export interface BackendHandle { app: BackendAppLike; runtime: BackendRuntimeLike; models: ModelRegistryLike }

function resolveBootstrapPath(): string {
  const cwd = process.cwd();
  const built = path.resolve(cwd, 'dist/src/backend/bootstrap.js');
  if (fs.existsSync(built)) return built;
  const transpiledSource = path.resolve(cwd, 'src/backend/bootstrap.js');
  if (fs.existsSync(transpiledSource)) return transpiledSource;
  const source = path.resolve(cwd, 'src/backend/bootstrap.ts');
  if (fs.existsSync(source)) return source;
  const here = path.dirname(fileURLToPath(import.meta.url));
  const relativeBuilt = path.resolve(here, '../../../src/backend/bootstrap.js');
  if (fs.existsSync(relativeBuilt)) return relativeBuilt;
  const relativeSource = path.resolve(here, '../../../src/backend/bootstrap.ts');
  return relativeSource;
}

export async function loadLegacyBackend(dataDir: string, persistence: any = null): Promise<BackendHandle> {
  const modulePath = pathToFileURL(resolveBootstrapPath());
  const mod = await import(modulePath.href) as { createBackend: (options: { dataDir: string; persistence?: any }) => Promise<BackendHandle> | BackendHandle };
  return await mod.createBackend({ dataDir, persistence });
}
