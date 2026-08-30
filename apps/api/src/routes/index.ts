import { Router } from '../compat/router.js';
import { router as analysisRouter } from './analysis.routes.js';
import { router as observationRouter } from './observation.routes.js';
import { router as evaluationRouter } from './evaluation.routes.js';
import { router as evidenceRouter } from './evidence.routes.js';
import { router as reviewRouter } from './review.routes.js';
import { legacyV1Router } from './route-groups.js';

export const apiCapabilityRouter = new Router();
for (const router of [
  observationRouter, analysisRouter, evaluationRouter, evidenceRouter, reviewRouter,
]) apiCapabilityRouter.use(router);
apiCapabilityRouter.use(legacyV1Router);
