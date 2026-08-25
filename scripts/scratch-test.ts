import { createPersistence } from '../packages/persistence/src/index.js';
import { verifySeedState } from '../packages/persistence/src/seed-verification.js';

async function run() {
  const store = createPersistence({ driver: 'postgres' });
  await store.ready?.();
  try {
    const res = await verifySeedState(process.cwd(), store, { assertOk: false });
    console.log(JSON.stringify(res, null, 2));
  } finally {
    await store.close();
  }
}

run().catch(console.error);
