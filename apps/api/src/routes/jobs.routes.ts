import { selectRoutes } from './route-groups.js';
export const jobsRouter = selectRoutes((path) => path.includes('/jobs/'));
