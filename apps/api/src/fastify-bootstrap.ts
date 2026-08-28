import type { FastifyInstance, FastifyReply } from 'fastify';
import type { RouteContext } from './route-context.js';
import type { Router } from './router.js';
import type { UniverseStore } from '@moonwitness/persistence';
import type { PersistentJobQueue } from '@moonwitness/jobs';
import type { WitnessRouteContext } from './route-context.js';
import * as orchestrator from '@moonwitness/orchestrator';

/**
 * Stable application ports exposed to Fastify plugins.  Plugins consume these
 * ports instead of importing the native HTTP bootstrap or legacy src tree.
 */
export interface FastifyDependencyPorts {
  persistence: UniverseStore;
  auth: RouteContext['auth'];
  jobs: PersistentJobQueue;
  witness: WitnessRouteContext;
  orchestrator: typeof orchestrator;
}

declare module 'fastify' {
  interface FastifyInstance {
    cosmic: FastifyDependencyPorts;
    persistence: UniverseStore;
    auth: RouteContext['auth'];
    jobs: PersistentJobQueue;
    witness: WitnessRouteContext;
    orchestrator: typeof orchestrator;
  }
}

export interface FastifyBootstrapOptions {
  app: FastifyInstance;
  context: RouteContext;
  /** Register the canonical native Router routes through a compatibility adapter. */
  router?: Router;
  plugins?: Array<(app: FastifyInstance, options: { ctx: RouteContext }) => Promise<void>>;
}

export async function bootstrapFastify(options: FastifyBootstrapOptions): Promise<FastifyInstance> {
  const { app, context, plugins } = options;

  const ports: FastifyDependencyPorts = {
    persistence: context.universeStore,
    auth: context.auth,
    jobs: context.jobs,
    witness: context.witness,
    orchestrator,
  };

  for (const [key, value] of Object.entries(context)) {
    if (!app.hasDecorator(key)) app.decorate(key, value);
  }

  // Canonical aliases keep Fastify adapters independent from RouteContext's
  // historical naming while preserving the native runtime unchanged.
  if (!app.hasDecorator('cosmic')) app.decorate('cosmic', ports);
  if (!app.hasDecorator('persistence')) app.decorate('persistence', ports.persistence);
  if (!app.hasDecorator('auth')) app.decorate('auth', ports.auth);
  if (!app.hasDecorator('jobs')) app.decorate('jobs', ports.jobs);
  if (!app.hasDecorator('witness')) app.decorate('witness', ports.witness);
  if (!app.hasDecorator('orchestrator')) app.decorate('orchestrator', ports.orchestrator);

  if (plugins) {
    for (const plugin of plugins) {
      await app.register(plugin, { ctx: context });
    }
  }

  if (options.router) registerRouterRoutes(app, options.router, context);

  return app;
}

/**
 * Route parity adapter. Route implementations remain single-sourced in the
 * native Router while Fastify owns dispatch, lifecycle, and serialization.
 */
function registerRouterRoutes(app: FastifyInstance, router: Router, context: RouteContext): void {
  for (const route of router.routes) {
    const url = route.pattern.regex.source
      .replace(/^\^/, '')
      .replaceAll('\\/', '/')
      .replace(/\/?\$$/, '')
      .replace(/\/\?$/, '')
      .replaceAll('([^/]+)', ':param');
    // Router stores parameter names separately; reconstruct the Fastify path
    // so each handler receives the same decoded params as native HTTP.
    let parameterIndex = 0;
    const fastifyUrl = url.replace(/:param/g, (_match, offset: number) => {
      const name = route.paramNames[parameterIndex++] ?? 'param';
      // Fastify's named parameters stop at '/'. Use a terminal wildcard for
      // native Router parameters so encoded slashes retain native semantics.
      return parameterIndex === route.paramNames.length && offset + ':param'.length === url.length ? `*` : `:${name}`;
    });
    app.route({
      method: route.method as 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'HEAD',
      url: fastifyUrl,
      handler: async (request, reply) => {
        const rawRequest = request.raw;
        const rawReply = createReplyAdapter(reply);
        const query = new URL(request.url, 'http://fastify.local').searchParams;
        try {
          const rawParams = request.params as Record<string, string>;
          const params = Object.fromEntries(route.paramNames.map((name) => [name, rawParams[name] ?? rawParams['*'] ?? ''])) as Record<string, string>;
          const result = await route.handler(
            rawRequest,
            rawReply as unknown as import('node:http').ServerResponse,
            params,
            request.body,
            query,
            context,
          );
          if (rawReply.writableEnded) return undefined;
          if (isStatusResult(result)) return reply.status(result.statusCode).send(result.body);
          if (result === undefined) return reply.status(204).send();
          const requestId = String(reply.getHeader('x-request-id') ?? request.id);
          const body = isObject(result) ? { ...result, request_id: requestId } : result;
          return reply.status(200).send(body);
        } catch (error) {
          throw error;
        }
      },
    });
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStatusResult(value: unknown): value is { statusCode: number; body: unknown } {
  return isObject(value) && typeof value.statusCode === 'number' && 'body' in value;
}

interface FastifyReplyAdapter {
  setHeader(name: string, value: unknown): void;
  writeHead(statusCode: number, headers?: Record<string, unknown>): void;
  write(chunk: unknown): void;
  end(payload?: unknown): void;
  readonly writableEnded: boolean;
}

function createReplyAdapter(reply: FastifyReply): FastifyReplyAdapter {
  return {
    setHeader(name: string, value: unknown) { reply.header(name, value); },
    writeHead(statusCode: number, headers?: Record<string, unknown>) {
      reply.status(statusCode);
      if (headers) for (const [name, value] of Object.entries(headers)) reply.header(name, value);
    },
    write(chunk: unknown) { reply.raw.write(chunk); },
    end(payload?: unknown) { if (!reply.sent) reply.send(payload); },
    get writableEnded() { return reply.sent || reply.raw.writableEnded; },
  };
}
