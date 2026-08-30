import { selectRoutes } from './route-groups.js';
export const semanticRouter = selectRoutes((path) => path.includes('/semantic/'));
