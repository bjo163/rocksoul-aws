import { evaluateMizan, evaluateQuranicMizan } from '@moonwitness/mizan-engine';
import { explainTemporalContext } from '@moonwitness/explanation-engine';
import { buildHumanReviewGate } from '@moonwitness/contracts';

export type Loose = Record<string, any>;

/** Host-neutral provider boundary. Providers return observations, never verdicts. */
export class AiProvider {
  readonly name: string; readonly capabilities: string[];
  constructor({ name = 'abstract', capabilities = [] }: Loose = {}) { this.name = name; this.capabilities = [...capabilities]; }
  async analyze(_text = '', _options: Loose = {}): Promise<Loose> { throw new Error(`AI provider '${this.name}' requires an implementation`); }
}
export class LocalStructuredProvider extends AiProvider {
  constructor(private readonly analyzeFn: (text: string, options: Loose) => Promise<Loose> | Loose) { super({ name: 'local-structured', capabilities: ['semantic-contract'] }); }
  async analyze(text: string, options: Loose = {}) { return this.analyzeFn(text, options); }
}
export class StaticSemanticProvider extends AiProvider {
  constructor(private readonly observation: Loose) { super({ name: 'static-semantic', capabilities: ['semantic-contract'] }); }
  async analyze() { return structuredClone(this.observation ?? {}); }
}
export class HttpJsonAiProvider extends AiProvider {
  constructor(private readonly config: { url: string; apiKey?: string; headers?: Loose; name?: string; model?: unknown }) {
    super({ name: config.name ?? 'http-json', capabilities: ['semantic-contract', 'alternatives', 'conflicts', 'timeline', 'evidence'] });
    if (!config.url) throw new Error('AI provider URL is required');
  }
  async analyze(text: string, options: Loose = {}) {
    const response = await fetch(this.config.url, { method: 'POST', headers: { 'content-type': 'application/json', ...(this.config.apiKey ? { authorization: `Bearer ${this.config.apiKey}` } : {}), ...(this.config.headers ?? {}) }, body: JSON.stringify({ text, options, response_format: 'semantic_observation_v1', model: this.config.model ?? null }) });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(`AI provider request failed (${response.status})`);
    return payload.semanticObservation ?? payload.observation ?? payload;
  }
}
export function providerDescriptor(provider: AiProvider): Loose { return { name: provider.name, capabilities: [...provider.capabilities] }; }

/** Deterministic, offline baseline. Hosts may inject a richer provider. */
export class RegistrySemanticProvider extends AiProvider {
  constructor(readonly root = process.cwd()) { super({ name: 'moonwitness-registry-semantic', capabilities: ['semantic-contract', 'offline', 'deterministic'] }); }
  async analyze(text: string): Promise<Loose> {
    const normalized = String(text ?? '').trim();
    return { status: normalized ? 'INFERRED' : 'UNKNOWN', mode: 'UNKNOWN', action: null, confidence: 0, intention: { label: 'UNRESOLVED', confidence: 0, rgbl: { R: 0, G: 0, B: 0, L: 0 } }, entities: [], contexts: {}, claim: { text: null, referenceCandidates: [], sourceCandidates: [] }, actionGateVector: [], impactVector: [], timeFactor: {}, causality: {}, domainVector: {}, evidence: [], alternatives: [], conflicts: [], timeline: [], epistemicSignals: {} };
  }
}
export function createDefaultSemanticProvider(root = process.cwd()) { return new RegistrySemanticProvider(root); }

export function buildAiAnalysis(text: string, options: Loose = {}): Loose {
  const observation = options.semanticObservation ?? null;
  const persistedEvidence = Array.isArray(options.persistedEvidence) ? options.persistedEvidence : [];
  const observed = observation ?? { confidence: 0, intention: { label: 'UNRESOLVED', rgbl: { R: 0, G: 0, B: 0, L: 0 } }, actionGateVector: [], impactVector: [], timeFactor: {}, evidence: [], conflicts: [] };
  const mergedObserved = { ...observed, evidence: [...(Array.isArray(observed.evidence) ? observed.evidence : []), ...persistedEvidence] };
  const mizan = observation ? evaluateMizan({ ...mergedObserved, semantic: mergedObserved.intention?.rgbl ?? mergedObserved.semantic, semanticVector: options.semanticVector ?? {}, scale: options.scale ?? {}, confidence: mergedObserved.confidence ?? 0, evidenceQuality: .25 }) : null;
  const quranicMizan = observation ? evaluateQuranicMizan({ text, observed: mergedObserved, mizan, conflicts: mergedObserved.conflicts ?? [] }) : null;
  const timeFactor = options.temporalInput ? options.toMizanTemporalContext?.(options.temporalInput) : mergedObserved.timeFactor;
  const reviewGate = buildHumanReviewGate({ observed: mergedObserved, quranicMizan, scorecard: null, conflicts: mergedObserved.conflicts ?? [] });
  return { text, intent: observation ? (mergedObserved.intention?.label ?? mergedObserved.intent ?? 'UNRESOLVED') : 'UNRESOLVED', entities: mergedObserved.entities ?? [], contexts: mergedObserved.contexts ?? {}, claim: mergedObserved.claim ?? { text: null, referenceCandidates: [], sourceCandidates: [] }, candidateActions: [], alternatives: mergedObserved.alternatives ?? [], conflicts: mergedObserved.conflicts ?? [], timeline: mergedObserved.timeline ?? [], sourceMatches: [], semanticVector: observation ? mergedObserved : null, intention: mergedObserved.intention, scale: options.scale ?? {}, mizan: mizan ? { ...mizan, quranic: quranicMizan } : null, quranicMizan, temporalReasoning: timeFactor?.schema === 'MIZAN_TEMPORAL_CONTEXT_V1' ? explainTemporalContext(text, timeFactor) : null, revelationScorecard: observation ? { protocol: 'REVELATION_SCORECARD_V1', version: '4.33.0' } : null, reviewGate, ruleResolution: { candidates: [] }, confidence: { score: mergedObserved.confidence ?? 0, band: 'MINIMAL', semantic: mergedObserved.confidence ?? 0, evidenceQuality: .25, uncertainty: 1 - (mergedObserved.confidence ?? 0) }, provenance: { model: { id: 'moonwitness-cosmic-engine', version: '4.33.0' } }, lifecycle: null, capability: { modelOnly: true, sourceGrounded: false, ruleGrounded: false } };
}
export async function analyzeWithProvider(text: string, { provider, ...options }: Loose = {}) { if (!provider?.analyze) throw new Error('A semantic AI provider is required.'); return buildAiAnalysis(text, { ...options, semanticObservation: await provider.analyze(text, options) }); }
export async function analyzeAutomatically(text: string, options: Loose = {}) { return analyzeWithProvider(text, { ...options, provider: options.provider ?? createDefaultSemanticProvider(options.root) }); }
