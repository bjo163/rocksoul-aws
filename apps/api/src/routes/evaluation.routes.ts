import { selectRoutes } from './route-groups.js';
export const evaluationRouter = selectRoutes((path) => path.includes('/evaluate'));
