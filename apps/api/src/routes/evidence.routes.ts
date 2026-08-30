import { selectRoutes } from './route-groups.js';
export const evidenceRouter = selectRoutes((path) => path.includes('/evidence'));
