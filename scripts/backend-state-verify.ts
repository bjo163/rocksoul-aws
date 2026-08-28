import { UniverseStore } from '@moonwitness/persistence';
import { loadDatabaseConfig } from '../src/config-loader.js';

async function main() {
  if ((process.env.STORAGE_DRIVER ?? 'postgres') !== 'postgres') throw new Error('BACKEND_STATE_VERIFY_REQUIRES_POSTGRES');
  const root = process.cwd();
  const dataDir = process.env.MOONWITNESS_DATA_DIR ?? '.data';
  const config = loadDatabaseConfig(root);
  const store = new UniverseStore({ driver: 'postgres', dataDir: `${dataDir}/universe`, postgres: config.storage?.postgres });
  await store.persistence.ready();
  const entities = await store.persistence.entities().list();
  const backendEntities = entities.filter((x) => x.type.startsWith('BACKEND.ENTITY') || x.type.startsWith('BACKEND.RESOURCE') || x.type.startsWith('BACKEND.ASSET'));
  const types = entities.filter((x) => x.type === 'BACKEND.TYPE');
  const events = await store.persistence.events().listAll();
  const backendEvents = events.filter((x) => x.payload?._backendGraph === true);
  const result = { ok: true, backendEntities: backendEntities.length, backendTypes: types.length, backendEvents: backendEvents.length, audit: await store.persistence.auditStore().verify(), eventChain: await store.persistence.events().verifyChain(), localRuntimeStateExpected: false };
  console.log(JSON.stringify(result, null, 2));
  await store.close();
}

main().catch((error) => { console.error(error instanceof Error ? error.stack : error); process.exitCode = 1; });
