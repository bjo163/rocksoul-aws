import Fastify, { type FastifyInstance } from 'fastify';
import { registerTelemetry } from './telemetry/telemetry.js';

export interface FastifyRuntimeOptions {
  logger?: boolean;
  telemetry?: boolean;
  enableCorrelationId?: boolean;
}

export interface FastifyApp {
  start(port: number, host: string): Promise<void>;
  close(): Promise<void>;
}

const RELEASE = '4.33.0';
const DEFAULT_BODY_LIMIT = 1024 * 1024;

export async function buildFastifyRuntime(options: FastifyRuntimeOptions = {}): Promise<FastifyInstance> {
  const app = Fastify({
    logger: options.logger ?? false,
    bodyLimit: DEFAULT_BODY_LIMIT,
  });

  await registerTelemetry(app, { enabled: options.telemetry });

  if (options.enableCorrelationId ?? true) {
    app.addHook('onRequest', async (request, reply) => {
      let requestId = String(request.headers['x-request-id'] ?? '');
      if (!requestId) {
        requestId = crypto.randomUUID();
      }
      reply.header('X-Request-Id', requestId);
    });
  }

  app.addHook('onRequest', async (request, reply) => {
    const method = String(request.method ?? 'GET').toUpperCase();
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      const contentType = String(request.headers['content-type'] ?? '');
      if (!contentType.includes('application/json')) {
        return reply.status(415).send({ error: 'UNSUPPORTED_MEDIA_TYPE', request_id: request.id });
      }
    }
  });

  app.setErrorHandler((error, _request, reply) => {
    const isError = error instanceof Error;
    const statusCode = isError && 'statusCode' in error ? (error as { statusCode: number }).statusCode : 500;
    const isProduction = process.env.NODE_ENV === 'production';
    const payload: Record<string, unknown> = {
      error: statusCode >= 500 ? 'INTERNAL_ERROR' : String(isError ? error.message : 'BAD_REQUEST'),
      request_id: reply.request.id,
    };
    if (!isProduction && isError) {
      payload.message = error.message;
      payload.stack = error.stack;
    }
    reply.status(statusCode).send(payload);
  });

  app.get('/health', async (_request, reply) => {
    const base: Record<string, unknown> = { status: 'ok', release: RELEASE };
    const universeStore = (reply.server as FastifyInstance & { universeStore?: { persistence: { store: { driver: string } } } }).universeStore;
    if (universeStore) {
      base.storageDriver = universeStore.persistence.store.driver;
    } else {
      base.storageDriver = 'file';
    }
    const backend = (reply.server as FastifyInstance & { backend?: { app?: { health?: () => Record<string, unknown> } } }).backend;
    if (backend?.app?.health) {
      Object.assign(base, backend.app.health());
    }
    const auth = (reply.server as FastifyInstance & { auth?: { _users?: Map<string, unknown> } }).auth;
    base.needsSetup = (auth?._users?.size ?? 0) === 0;
    base.environment = process.env.MOONWITNESS_ENV ?? process.env.NODE_ENV ?? 'development';
    base.database = process.env.PGDATABASE ?? null;
    return base;
  });

  app.get('/ready', async (_request, reply) => {
    const universeStore = (reply.server as FastifyInstance & { universeStore?: { persistence: { store: { driver: string } } } }).universeStore;
    const storageDriver = universeStore?.persistence.store.driver ?? 'file';
    return { status: 'ready', release: RELEASE, storageDriver };
  });

  app.post('/test/echo', async (request, _reply) => {
    return { received: request.body };
  });

  let shuttingDown = false;

  async function shutdown(): Promise<void> {
    if (shuttingDown) return;
    shuttingDown = true;
    try {
      await app.close();
    } catch (error) {
      app.log.error(error as Error, 'Graceful shutdown failed');
    }
  }

  const onSignal = () => { void shutdown(); };
  process.on('SIGTERM', onSignal);
  process.on('SIGINT', onSignal);
  app.addHook('onClose', async () => {
    process.off('SIGTERM', onSignal);
    process.off('SIGINT', onSignal);
  });

  return app;
}
