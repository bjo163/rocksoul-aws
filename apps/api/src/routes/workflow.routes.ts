import { selectRoutes } from './route-groups.js';
export const workflowRouter = selectRoutes((path) => path.includes('/flow/') || path.includes('/workflow'));
