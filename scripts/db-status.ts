import { getLatestSchemaVersion } from '../packages/persistence/src/schema.js';
import type { PersistenceDriver } from '../packages/persistence/src/types.js';

const driver = ((process.env.STORAGE_DRIVER ?? 'sqlite') as PersistenceDriver);
console.log(JSON.stringify({
  driver,
  schemaVersion: getLatestSchemaVersion(),
  sqliteFile: process.env.SQLITE_FILE ?? './data/moonwitness.db',
  seedManifest: './data/seed/manifest.json',
  note: 'Set STORAGE_DRIVER=postgres and PG* environment variables for PostgreSQL.'
}, null, 2));
