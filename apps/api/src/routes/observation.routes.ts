import { selectRoutes } from './route-groups.js';
export const observationRouter = selectRoutes((path) => path.includes('/observe'));
