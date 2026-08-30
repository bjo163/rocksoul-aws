import { selectRoutes } from './route-groups.js';
export const analysisRouter = selectRoutes((path) => path.includes('/analyze') || path.includes('/ai/analyze'));
