import { buildApp } from './app.js';
import { isFastifyEnabled } from './feature-flags.js';
import { buildFastifyRuntime } from './fastify-runtime.js';
import { bootstrapFastify } from './fastify-bootstrap.js';

async function start(): Promise<void> {
  const app = await buildApp();
  const port = Number(process.env.PORT ?? 8787);
  const host = process.env.HOST ?? '127.0.0.1';
  if (isFastifyEnabled()) {
    const fastify = await buildFastifyRuntime({ telemetry: process.env.OTEL_SDK_DISABLED !== 'true' });
    await bootstrapFastify({ app: fastify, context: app.context, router: app.router });
    fastify.addHook('onClose', async () => { await app.close(); });
    await fastify.listen({ port, host });
    console.log(`Universe OS API listening on http://${host}:${port} (fastify)`);
    return;
  }
  await app.start(port, host);
  console.log(`Universe OS API listening on http://${host}:${port}`);
}

start().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
