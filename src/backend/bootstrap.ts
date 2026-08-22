// @ts-nocheck
import {BackendRuntime} from './kernel/backend-runtime.js';
import {PostgresBackendRuntime} from './kernel/postgres-backend-runtime.js';
import {BackendApplicationService} from './application-service.js';
import {ModelRegistry} from './model-registry.js';
import { runtimeDataset } from '../persistence/runtime-data.js';

export async function createBackend({dataDir=process.env.MOONWITNESS_DATA_DIR ?? '.data', persistence=null}={}) {
  const rules=runtimeDataset('data/backend/rules.json');
  const runtime = persistence?.store?.driver === 'postgres'
    ? new PostgresBackendRuntime({persistence, rules})
    : new BackendRuntime({dataDir,rules});
  await runtime.ready?.();
  const app=new BackendApplicationService(runtime);
  const models=new ModelRegistry(runtime);
  return {runtime,app,models};
}
