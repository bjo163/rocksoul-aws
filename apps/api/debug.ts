import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';
import { buildApp } from './src/app.js';
async function test() {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'debug-'));
  console.log('DATADIR IS:', dataDir);
  const app = await buildApp({ dataDir });
  console.log('APP UNIVERSE_STORE IS:', app.handler.toString().length);
}
test().catch(console.error);
