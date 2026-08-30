import { selectRoutes } from './route-groups.js';
export const reviewRouter = selectRoutes((path) => path.includes('/review'));
