/**
 * Public, host-neutral description of the engine API surface.  This is kept
 * declarative so clients can discover testable units without reverse
 * engineering routes or depending on the API implementation.
 */
export type EngineOperationKind = 'UNIT' | 'WORKFLOW' | 'SNAPSHOT';

export interface EngineOperation {
  id: string;
  kind: EngineOperationKind;
  method: 'GET' | 'POST';
  path: string;
  package: string;
  authentication: 'PUBLIC' | 'EVALUATE' | 'ANALYZE';
  description: string;
  requestExample?: Record<string, unknown>;
}

export const ENGINE_OPERATIONS: readonly EngineOperation[] = Object.freeze([
  {
    id: 'mizan.evaluate', kind: 'UNIT', method: 'POST', path: '/api/v1/mizan',
    package: '@moonwitness/mizan-engine', authentication: 'EVALUATE',
    description: 'Evaluate a bounded Mizan input without persistence.',
    requestExample: { semantic: { R: 0.2, G: 0.1, B: 0, L: 0.3 } },
  },
  {
    id: 'aws.analyze', kind: 'UNIT', method: 'POST', path: '/api/v1/ai/analyze',
    package: '@moonwitness/aws-engine', authentication: 'ANALYZE',
    description: 'Run a single AI/semantic analysis; witness commit is conditional on permission.',
    requestExample: { text: 'A bounded semantic observation.', semanticObservation: { confidence: 0.5, intention: { label: 'UNRESOLVED', rgbl: { R: 0, G: 0, B: 0, L: 0 } } } },
  },
  {
    id: 'ingress.reminder', kind: 'UNIT', method: 'POST', path: '/api/v1/ingress/reminder',
    package: 'src/ingress (migration target)', authentication: 'ANALYZE',
    description: 'Generate a model-only reminder ingress; it does not assert real-world causality.',
    requestExample: { reminder: 'Review the available evidence before acting.' },
  },
  {
    id: 'revelation.core', kind: 'SNAPSHOT', method: 'GET', path: '/api/v1/revelation/core',
    package: '@moonwitness/revelation (incremental migration)', authentication: 'PUBLIC',
    description: 'Read the deterministic Revelation semantic-core snapshot.',
  },
  {
    id: 'workflow.observe', kind: 'WORKFLOW', method: 'POST', path: '/api/v1/observe',
    package: '@moonwitness/orchestrator', authentication: 'ANALYZE',
    description: 'Persist a versioned observation and immutable event.',
    requestExample: { entityId: 'CASE-DEMO-001', source: 'API_TEST', payload: { text: 'Observed input' } },
  },
  {
    id: 'workflow.analyze', kind: 'WORKFLOW', method: 'POST', path: '/api/v1/analyze',
    package: '@moonwitness/orchestrator', authentication: 'ANALYZE',
    description: 'Execute analysis, persistence, evidence lookup, and witness commit as one workflow.',
    requestExample: { caseId: 'CASE-DEMO-001', text: 'Analyze this bounded input.', semanticObservation: { confidence: 0.5, intention: { label: 'UNRESOLVED', rgbl: { R: 0, G: 0, B: 0, L: 0 } } } },
  },
  {
    id: 'workflow.evaluate', kind: 'WORKFLOW', method: 'POST', path: '/api/v1/evaluate',
    package: '@moonwitness/orchestrator', authentication: 'EVALUATE',
    description: 'Execute Mizan evaluation, review-gate validation, event append, and witness commit.',
    requestExample: { target: 'CASE-DEMO-001', input: { text: 'Evaluate this bounded input.' }, semanticObservation: { confidence: 0.5, intention: { label: 'UNRESOLVED', rgbl: { R: 0, G: 0, B: 0, L: 0 } } } },
  },
]);

export function engineCatalog() {
  return {
    protocol: 'MW_ENGINE_CATALOG_V1',
    operations: ENGINE_OPERATIONS,
    testModes: {
      unit: 'Call UNIT operations with the requestExample payload; no durable workflow is required.',
      workflow: 'Call observe, analyze, or evaluate against an isolated data directory and inspect the returned witness reference.',
    },
  };
}
