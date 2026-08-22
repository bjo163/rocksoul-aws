import { createPersistence } from '../packages/persistence/src/factory.js';
import { loadDatabaseConfig } from '../src/config-loader.js';

const config = loadDatabaseConfig();
const store = createPersistence({
  driver: 'postgres',
  postgres: {
    ...(config.storage?.postgres ?? {}),
    connectionString: process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? undefined,
    host: process.env.PGHOST ?? config.storage?.postgres?.host ?? 'localhost',
    port: Number(process.env.PGPORT ?? config.storage?.postgres?.port ?? 5432),
    database: process.env.PGDATABASE ?? config.storage?.postgres?.database ?? 'postgres',
    user: process.env.PGUSER ?? config.storage?.postgres?.user ?? 'postgres',
    ...(process.env.PGPASSWORD ? { password: process.env.PGPASSWORD } : {})
  }
});
try {
  await store.ready?.();
  const entities = await store.entityRepository().list();
  const events = await store.eventStore().listAll();
  console.log(JSON.stringify({
    ok: true,
    driver: store.driver,
    entities: entities.length,
    events: events.length,
  }, null, 2));
} finally {
  await store.close();
}
