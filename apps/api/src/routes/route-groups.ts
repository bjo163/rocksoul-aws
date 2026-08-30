import { Router } from '../compat/router.js';
import { v1Router } from './v1.routes.js';

export function selectRoutes(predicate: (path: string) => boolean): Router {
  const router = new Router();
  router.routes.push(...v1Router.routes.filter((route) => predicate(route.pattern.regex.source)));
  return router;
}

export const legacyV1Router = new Router();
legacyV1Router.routes.push(...v1Router.routes.filter((route) => {
  const source = route.pattern.regex.source;
  if (route.method === 'POST' && ['/api/v1/observe/?$', '/api/v1/analyze/?$', '/api/v1/evaluate/?$', '/api/v1/reviews/?$'].some((path) => source.includes(path))) return false;
  if (route.method === 'POST' && source.includes('/api/v1/resource/([^/]+)/evidence')) return false;
  return true;
}));
