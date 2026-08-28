import type { FastifyInstance } from 'fastify';
import type { RouteContext } from './route-context.js';

export interface FastifyBootstrapOptions {
  app: FastifyInstance;
  context: RouteContext;
  plugins?: Array<(app: FastifyInstance, options: { ctx: RouteContext }) => Promise<void>>;
}

export async function bootstrapFastify(options: FastifyBootstrapOptions): Promise<FastifyInstance> {
  const { app, context, plugins } = options;

  for (const [key, value] of Object.entries(context)) {
    app.decorate(key, value);
  }

  if (plugins) {
    for (const plugin of plugins) {
      await app.register(plugin, { ctx: context });
    }
  }

  return app;
}
