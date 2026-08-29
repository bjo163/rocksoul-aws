import { analyzeAutomatically, buildAiAnalysis, createDefaultSemanticProvider } from './analysis.js';
import { evaluateMizan, evaluateQuranicMizan } from '@moonwitness/mizan-engine';
import { calculateTemporalState, toMizanTemporalContext, type TSEInput } from '@moonwitness/tse-engine';
import { explainLegalResult, explainTemporalContext } from '@moonwitness/explanation-engine';
import { buildAnalyticalSemanticVector, SemanticRegistry } from '@moonwitness/semantic-engine';
import { compareTime, makeTimeEvent, now } from '@moonwitness/temporal-engine';
import { createProvenanceAuditPackage } from './provenance-export.js';
export { createProvenanceAuditPackage, serializeProvenanceAuditPackage, verifyProvenanceAuditPackage } from './provenance-export.js';
export type { AuditExportInput, ProvenanceAuditPackage } from './provenance-export.js';

export {
  buildAnalyticalSemanticVector,
  compareTime,
  explainLegalResult,
  explainTemporalContext,
  evaluateMizan,
  evaluateQuranicMizan,
  makeTimeEvent,
  now,
  SemanticRegistry,
};

export type CosmicSemanticObservationStatus = 'AVAILABLE' | 'UNAVAILABLE';

export interface CosmicSemanticObservation {
  protocol: 'COSMIC_SEMANTIC_OBSERVATION_V1';
  status: CosmicSemanticObservationStatus;
  metadata: {
    provider: string;
    configurationFingerprint: string;
    capabilities: string[];
  };
  candidates: Array<{
    label: string;
    kind: 'ENTITY' | 'EVENT' | 'ACTION' | 'CLAIM' | 'SOURCE_HINT';
    confidence?: number;
    evidenceHints?: string[];
  }>;
  intentionSignals: string[];
  diagnostics: string[];
}

export { calculateTemporalState, toMizanTemporalContext } from '@moonwitness/tse-engine';
export type { TSEInput, TSETemporalState } from '@moonwitness/tse-engine';
export type MizanInput = Record<string, unknown>;
export type MizanResult = Record<string, unknown>;
export type MizanTemporalContext = Record<string, unknown>;
export function evaluateMizanService(input: MizanInput): MizanResult { return evaluateMizan(input) as MizanResult; }
export { AiProvider, LocalStructuredProvider, StaticSemanticProvider, HttpJsonAiProvider, RegistrySemanticProvider, createDefaultSemanticProvider, providerDescriptor, analyzeAutomatically, buildAiAnalysis, analyzeWithProvider } from './analysis.js';

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === 'object' ? value as UnknownRecord : {};
}

/**
 * Convert the internal registry result into a provider-safe observation.
 * Authority, evidence status, scores, and Revelation decisions are deliberately
 * omitted; the host must resolve those against its canonical graph.
 */
export function toCosmicSemanticObservation(raw: UnknownRecord): CosmicSemanticObservation {
  const candidates: CosmicSemanticObservation['candidates'] = [];
  for (const itemValue of Array.isArray(raw.actionCandidates) ? raw.actionCandidates : []) {
    const item = asRecord(itemValue);
    const label = String(item?.action ?? '').trim();
    if (!label) continue;
    candidates.push({
      label,
      kind: 'ACTION',
      confidence: Number.isFinite(Number(item.score)) ? Math.max(0, Math.min(1, Number(item.score))) : undefined,
      evidenceHints: item.matchedAlias ? [String(item.matchedAlias)] : undefined
    });
  }
  for (const itemValue of Array.isArray(raw.entities) ? raw.entities : []) {
    const item = asRecord(itemValue);
    const label = String(item?.label ?? item?.name ?? item?.id ?? '').trim();
    if (label) candidates.push({ label, kind: 'ENTITY' });
  }
  const claim = asRecord(raw.claim);
  if (typeof claim.text === 'string' && claim.text.trim()) {
    candidates.push({ label: claim.text.trim(), kind: 'CLAIM', evidenceHints: Array.isArray(claim.referenceCandidates) ? claim.referenceCandidates.map(String) : undefined });
  }
  const signals: string[] = [];
  const epistemic = asRecord(raw.epistemicSignals);
  if (epistemic.intentional) signals.push('DECLARED_INTENT_SIGNAL');
  if (epistemic.mistake) signals.push('MISTAKE_SIGNAL');
  if (epistemic.coercion) signals.push('COERCION_SIGNAL');
  if (!signals.length) signals.push('UNKNOWN');
  return {
    protocol: 'COSMIC_SEMANTIC_OBSERVATION_V1',
    status: raw.status === 'UNKNOWN' ? 'UNAVAILABLE' : 'AVAILABLE',
    metadata: {
      provider: 'cosmic-registry-semantic',
      configurationFingerprint: 'cosmic-registry-semantic-v1',
      capabilities: ['deterministic', 'offline', 'candidate-extraction']
    },
    candidates,
    intentionSignals: signals,
    diagnostics: ['Candidates are non-authoritative and require canonical host resolution.']
  };
}

export interface CosmicEngineConfig {
  root?: string;
  storage?: {
    type: 'memory' | 'file' | 'postgres';
    directory?: string;
    connectionString?: string;
  };
  logLevel?: 'debug' | 'info' | 'warn' | 'error' | 'silent';
}

export interface AnalyzeInputObject {
  text: string;
  temporalInput?: TSEInput;
  options?: Record<string, unknown>;
  semanticObservation?: Record<string, unknown>;
}

export type AnalyzeInput = string | AnalyzeInputObject;

export interface QueryInput {
  type?: 'SEMANTIC' | 'TEMPORAL' | 'GENERAL';
  concept?: string;
  query?: string;
  temporal?: TSEInput;
  [key: string]: unknown;
}

export interface EvaluateInput {
  type?: 'MIZAN' | 'QURANIC' | 'TSE';
  temporal?: TSEInput;
  quranic?: boolean;
  payload?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface ExplainInput {
  type?: 'TEMPORAL' | 'LEGAL' | 'AUDIT' | 'GENERAL';
  text?: string;
  timeFactor?: Record<string, unknown>;
  result?: Record<string, unknown>;
  audit?: import('./provenance-export.js').AuditExportInput;
  [key: string]: unknown;
}

/**
 * Integration facade for Moonwitness and host applications.
 * Exposes unified operations: analyze, query, evaluate, explain, execute.
 */
export function createCosmicEngine(configOrRoot: string | CosmicEngineConfig = process.cwd()) {
  const root = typeof configOrRoot === 'string' ? configOrRoot : (configOrRoot.root ?? process.cwd());
  const config: CosmicEngineConfig = typeof configOrRoot === 'string' ? { root } : { root, ...configOrRoot };
  const semanticProvider = createDefaultSemanticProvider(root);

  return Object.freeze({
    config,
    calculateTemporalState(input: TSEInput) {
      return calculateTemporalState(input);
    },
    makeTimeEvent,
    compareTime,
    now,
    buildAnalyticalSemanticVector,
    createSemanticRegistry(definitions: ConstructorParameters<typeof SemanticRegistry>[0] = {}) {
      return new SemanticRegistry(definitions);
    },
    async analyzeSemantic(text: string) {
      return toCosmicSemanticObservation(await semanticProvider.analyze(text));
    },
    evaluateMizan: evaluateMizanService,
    evaluateMizanModel: evaluateMizan,
    evaluateQuranicMizan,
    explainTemporalContext,
    explainLegalResult,
    createProvenanceAuditPackage: (input: import('./provenance-export.js').AuditExportInput) => createProvenanceAuditPackage(input),
    async analyze(input: AnalyzeInput, temporalInput?: TSEInput) {
      const text = typeof input === 'string' ? input : (typeof input?.text === 'string' ? input.text : '');
      const temporal = typeof input === 'object' && input?.temporalInput ? input.temporalInput : temporalInput;
      const options = typeof input === 'object' && input?.options ? { ...input.options } : {};
      const semanticObservation = typeof input === 'object' && input?.semanticObservation
        ? input.semanticObservation
        : await semanticProvider.analyze(text);
      const timeFactor = temporal ? toMizanTemporalContext(calculateTemporalState(temporal)) : (semanticObservation as UnknownRecord).timeFactor;
      return buildAiAnalysis(text, { root, ...options, semanticObservation: { ...(semanticObservation as UnknownRecord), timeFactor } });
    },
    async query(input: QueryInput) {
      if (input.type === 'SEMANTIC' || input.concept || input.query) {
        const queryTerm = String(input.concept ?? input.query ?? '');
        const observation = await semanticProvider.analyze(queryTerm);
        return {
          type: 'SEMANTIC',
          query: queryTerm,
          observation: toCosmicSemanticObservation(observation),
          vector: buildAnalyticalSemanticVector({ primary: [queryTerm], relevance: { [queryTerm]: 1 } }),
        };
      }
      if (input.type === 'TEMPORAL' && input.temporal) {
        return {
          type: 'TEMPORAL',
          temporal: calculateTemporalState(input.temporal),
        };
      }
      return {
        type: 'GENERAL',
        status: 'RESOLVED',
        timestamp: now(),
      };
    },
    async evaluate(input: EvaluateInput) {
      if (input.type === 'TSE' && input.temporal) {
        return calculateTemporalState(input.temporal);
      }
      if (input.type === 'QURANIC' || input.quranic) {
        return evaluateQuranicMizan(input.payload ?? input);
      }
      return evaluateMizan(input.payload ?? input);
    },
    async explain(input: ExplainInput) {
      if (input.type === 'TEMPORAL' && input.text) {
        return explainTemporalContext(input.text, input.timeFactor ?? {});
      }
      if (input.type === 'LEGAL' && input.result) {
        return explainLegalResult(input.result);
      }
      if (input.audit) {
        return createProvenanceAuditPackage(input.audit);
      }
      return {
        explanation: 'Analytical evaluation completed under deterministic offline rules.',
        timestamp: now(),
      };
    },
    async execute(workflow: string, input: Record<string, unknown>, _ports?: Record<string, unknown>) {
      return {
        workflow,
        status: 'ACCEPTED',
        executedAt: now(),
        payload: input,
      };
    },
  });
}

