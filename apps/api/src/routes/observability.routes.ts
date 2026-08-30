import { selectRoutes } from './route-groups.js';
export const observabilityRouter = selectRoutes((path) => path.includes('/observability/') || path.endsWith('/metrics') || path.endsWith('/stream'));
