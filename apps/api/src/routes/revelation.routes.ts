import { selectRoutes } from './route-groups.js';
export const revelationRouter = selectRoutes((path) => path.includes('/revelation/'));
