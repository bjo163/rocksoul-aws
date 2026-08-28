import Fastify, { type FastifyInstance } from 'fastify';
import { FastifyOtelInstrumentation } from '@fastify/otel';

export interface FastifyRuntimeOptions {
  logger?: boolean;
  telemetry?: boolean;
}

/**
 * Transitional Fastify surface. Native HTTP remains the production API until
 * route parity is proven; this surface provides health/readiness and telemetry
 * hooks without coupling the engine to a web framework.
 */
export async function buildFastifyRuntime(options: FastifyRuntimeOptions = {}): Promise<FastifyInstance> {
  const app = Fastify({ logger: options.logger ?? false });
  if (options.telemetry ?? process.env.OTEL_ENABLED === '1') {
    const instrumentation = new FastifyOtelInstrumentation();
    await app.register(instrumentation.plugin());
  }
  app.get('/health', async () => ({ ok: true, runtime: 'fastify', phase: 'transitional' }));
  app.get('/ready', async () => ({ ok: true, runtime: 'fastify', nativeApiFallback: true }));
  return app;
}
