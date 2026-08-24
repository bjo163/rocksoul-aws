import { getLatestSchemaVersion } from '../packages/persistence/src/schema.js';
import type { PersistenceDriver } from '../packages/persistence/src/types.js';

const configured = process.env.STORAGE_DRIVER ?? 'postgres';
if (configured !== 'memory' && configured !== 'file' && configured !== 'postgres') {
  throw new Error(`Unsupported STORAGE_DRIVER: ${configured}. Supported drivers: memory, file, postgres`);
}
const driver = configured as PersistenceDriver;
console.log(JSON.stringify({
  driver,
  schemaVersion: getLatestSchemaVersion(),
  persistenceDir: process.env.PERSISTENCE_DIR ?? './data/runtime',
  seedManifest: './data/seed/manifest.json',
  note: 'PostgreSQL is the durable runtime backend; file is portable local persistence; memory is ephemeral.'
}, null, 2));
