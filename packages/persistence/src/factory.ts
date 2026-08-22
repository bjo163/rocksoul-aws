import { SqliteProvider } from './sqlite.js';
import { PostgresProvider } from './postgres.js';
import { MemoryProvider } from './memory.js';
import { FileProvider } from './file.js';
import type { PersistenceConfig, PersistenceDriver, PersistenceStore } from './types.js';

export function createPersistence(config: PersistenceConfig = {}): PersistenceStore {
  const driver: PersistenceDriver = config.driver ?? (process.env.STORAGE_DRIVER as PersistenceDriver | undefined) ?? 'memory';
  console.log('CREATE PERSISTENCE DRIVER:', driver, 'FILEDIR:', config.fileDir);
  switch (driver) {
    case 'sqlite': return new SqliteProvider(config.sqliteFile ?? process.env.SQLITE_FILE ?? './data/moonwitness.db');
    case 'postgres': return new PostgresProvider(config.postgres ?? {});
    case 'memory': return new MemoryProvider();
    case 'file': return new FileProvider(config.fileDir ?? process.env.PERSISTENCE_DIR ?? './data/runtime');
    default: throw new Error(`Unsupported STORAGE_DRIVER: ${driver}`);
  }
}
