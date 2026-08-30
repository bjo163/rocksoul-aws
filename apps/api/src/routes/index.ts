import { Router } from '../compat/router.js';
import { analysisRouter } from './analysis.routes.js';
import { observationRouter } from './observation.routes.js';
import { evaluationRouter } from './evaluation.routes.js';
import { evidenceRouter } from './evidence.routes.js';
import { reviewRouter } from './review.routes.js';
import { workflowRouter } from './workflow.routes.js';
import { revelationRouter } from './revelation.routes.js';
import { jobsRouter } from './jobs.routes.js';
import { semanticRouter } from './semantic.routes.js';
import { observabilityRouter } from './observability.routes.js';

export const apiCapabilityRouter = new Router();
for (const router of [
  observabilityRouter, jobsRouter, semanticRouter, revelationRouter,
  observationRouter, analysisRouter, evaluationRouter, evidenceRouter,
  reviewRouter, workflowRouter,
]) apiCapabilityRouter.use(router);
