import { Router } from '../compat/router.js';
import {
  revelationSemanticCoreSnapshot,
  revelationGeographyReport,
  asmaEngineSnapshot,
  divineOntologySnapshot,
  revelationMoralGraph,
  fourBookCorpusSnapshot,
  revelationLifecycleSnapshot,
  revelationGrammarSnapshot,
} from '@moonwitness/revelation';

export const revelationRouter = new Router();

revelationRouter.add('GET', '/api/v1/revelation/core', async (_req, _reply, _params, _body, _query, _ctx) => revelationSemanticCoreSnapshot(process.cwd()));

revelationRouter.add('GET', '/api/v1/revelation/geography', async (_req, _reply, _params, _body, _query, _ctx) => revelationGeographyReport(process.cwd()));

revelationRouter.add('GET', '/api/v1/revelation/asma', async (_req, _reply, _params, _body, _query, _ctx) => asmaEngineSnapshot(process.cwd()));
revelationRouter.add('GET', '/api/v1/revelation/divine-ontology', async (_req, _reply, _params, _body, _query, _ctx) => divineOntologySnapshot(process.cwd()));

revelationRouter.add('GET', '/api/v1/revelation/moral-graph', async (_req, _reply, _params, _body, _query, _ctx) => revelationMoralGraph(process.cwd()));

revelationRouter.add('GET', '/api/v1/revelation/corpora', async (_req, _reply, _params, _body, _query, _ctx) => fourBookCorpusSnapshot(process.cwd()));

revelationRouter.add('GET', '/api/v1/revelation/lifecycle', async (_req, _reply, _params, _body, _query, _ctx) => revelationLifecycleSnapshot(process.cwd()));

revelationRouter.add('GET', '/api/v1/revelation/grammar', async (_req, _reply, _params, _body, _query, _ctx) => revelationGrammarSnapshot(process.cwd()));
