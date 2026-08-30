import { Router } from '../compat/router.js';
import { v1Router } from './v1.routes.js';

export function selectRoutes(predicate: (path: string) => boolean): Router {
  const router = new Router();
  router.routes.push(...v1Router.routes.filter((route) => predicate(route.pattern.regex.source)));
  return router;
}
