import { buildApp } from './app.js';

async function start(): Promise<void> {
  const app = await buildApp();
  const port = Number(process.env.PORT ?? 8787);
  const host = process.env.HOST ?? '127.0.0.1';
  await app.start(port, host);
  console.log(`Universe OS API listening on http://${host}:${port}`);
}

start().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
