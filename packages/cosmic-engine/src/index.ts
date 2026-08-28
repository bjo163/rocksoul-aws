import { buildAiAnalysis } from '../../../src/ai/general-analyzer.js';
import { createDefaultSemanticProvider } from '../../../src/ai/provider.js';
import { evaluateMizanService } from '../../../src/services/mizan-service.js';
import { calculateTemporalState, toMizanTemporalContext, type TSEInput } from '../../tse-engine/src/index.js';
import { explainLegalResult, explainTemporalContext } from '@moonwitness/explanation-engine';
import { evaluateMizan, evaluateQuranicMizan } from '@moonwitness/mizan-engine';
import { buildAnalyticalSemanticVector, SemanticRegistry } from '@moonwitness/semantic-engine';
import { compareTime, makeTimeEvent, now } from '@moonwitness/temporal-engine';

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

export { calculateTemporalState, toMizanTemporalContext } from '../../tse-engine/src/index.js';
export { evaluateMizanService } from '../../../src/services/mizan-service.js';
export type { MizanInput, MizanResult, MizanTemporalContext } from '../../../src/contracts/mizan.js';
export type { TSEInput, TSETemporalState } from '../../tse-engine/src/index.js';

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

/**
 * Minimal integration facade for Moonwitness and other hosts.
 * It contains no UI, persistence, authentication, or platform workflow API.
 */
export function createCosmicEngine(root = process.cwd()) {
  const semanticProvider = createDefaultSemanticProvider(root);
  return Object.freeze({
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
    async analyze(text: string, temporalInput?: TSEInput) {
      const semanticObservation = await semanticProvider.analyze(text);
      const timeFactor = temporalInput ? toMizanTemporalContext(calculateTemporalState(temporalInput)) : semanticObservation.timeFactor;
      return buildAiAnalysis(text, { root, semanticObservation: { ...semanticObservation, timeFactor } });
    },
  });
}
