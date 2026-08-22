import fs from 'node:fs';
import path from 'node:path';
import { runtimeDataset, runtimeDataRevision, runtimeDataReady } from '../persistence/runtime-data.js';
import { scriptureSourcePolicy } from '../revelation/scripture-source-policy.js';
import { bindActionToRevelation } from '../revelation/binding/native-revelation-binder.js';
import { deriveRevelationMagnitudeSignals } from '../revelation/scoring/revelation-magnitude.js';
import { parseSemanticEventGraph, interpretSemanticEventGraph, buildMoralLifecycle } from '../events/index.js';

type Loose = Record<string, any>;
type SemanticEngineData = {
  aliases: { entities?: Record<string, string[]>; actions?: Record<string, string[]> };
  ontology: Loose;
};

const clamp = (value: unknown, fallback = 0) => { const n = Number(value); return Number.isFinite(n) ? Math.max(-1, Math.min(1, n)) : fallback; };
const clamp01 = (value: unknown, fallback = 0) => { const n = Number(value); return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : fallback; };
const normalize = (value: unknown) => String(value ?? '').toLowerCase().normalize('NFKC');
const compact = (value: string) => normalize(value).replace(/[^\p{L}\p{N}:.'_-]+/gu, ' ').replace(/\s+/g, ' ').trim();
const tokenSet = (value: string) => new Set(compact(value).split(' ').filter(Boolean));

function readJson(root: string, relative: string, fallback: unknown): any {
  if (runtimeDataReady()) return runtimeDataset(relative);
  try { return JSON.parse(fs.readFileSync(path.resolve(root, relative), 'utf8')); } catch { return fallback; }
}

let cached: { root: string; revision: number; data: SemanticEngineData } | null = null;
function loadData(root: string): SemanticEngineData {
  const aliases = readJson(root, 'data/ai/concept-aliases.json', {});
  const semanticRegistry = readJson(root, 'data/semantic/registry.json', {});
  return {
    aliases: { entities: aliases.entities ?? {}, actions: aliases.actions ?? {} },
    ontology: semanticRegistry
  };
}
function getData(root = process.cwd()): SemanticEngineData {
  const resolved = path.resolve(root);
  const currentRevision = runtimeDataRevision();
  if (!cached || cached.root !== resolved || cached.revision !== currentRevision) cached = { root: resolved, revision: currentRevision, data: loadData(resolved) };
  return cached.data;
}

function phraseScore(text: string, phrase: string): number {
  const t = compact(text); const p = compact(phrase);
  if (!p) return 0;
  if (t === p) return 1;
  const phraseTokens = tokenSet(p); const textTokens = tokenSet(t);
  if (phraseTokens.size === 1) return textTokens.has(p) ? 0.94 : 0;
  if (t.includes(p)) return Math.min(0.995, 0.90 + Math.min(0.08, phraseTokens.size * 0.02));
  let overlap = 0;
  for (const tok of phraseTokens) if (textTokens.has(tok)) overlap++;
  if (overlap < 2) return 0;
  return Number(((overlap / phraseTokens.size) * 0.72).toFixed(4));
}

function countSignal(text: string, signals: unknown): number {
  const t = compact(text);
  return (Array.isArray(signals) ? signals : []).filter((x: unknown) => t.includes(compact(String(x)))).length;
}

function hasNegationNear(text: string, alias: string): boolean {
  const t = compact(text); const a = compact(alias); const index = t.indexOf(a);
  if (index < 0) return false;
  const window = t.slice(Math.max(0, index - 28), index);
  return /(^|\s)(tidak|bukan|jangan|belum|tanpa)(\s|$)/.test(window);
}

function findActionCandidates(text: string, data: SemanticEngineData): Array<{ action: string; score: number; matchedAlias: string; negated: boolean }> {
  const candidates: Array<{ action: string; score: number; matchedAlias: string; negated: boolean }> = [];
  for (const [action, aliases] of Object.entries(data.aliases.actions ?? {})) {
    let best = { score: 0, alias: '' };
    for (const alias of aliases ?? []) {
      const score = phraseScore(text, alias);
      if (score > best.score) best = { score, alias };
    }
    if (best.score >= 0.34) {
      candidates.push({ action, score: hasNegationNear(text, best.alias) ? best.score * 0.15 : best.score, matchedAlias: best.alias, negated: hasNegationNear(text, best.alias) });
    }
  }
  return candidates.sort((a, b) => b.score - a.score);
}

function inferEntities(text: string, data: SemanticEngineData): Loose[] {
  const out: Loose[] = [];
  for (const [type, aliases] of Object.entries(data.aliases.entities ?? {})) {
    const matched = (aliases ?? []).filter(alias => phraseScore(text, alias) >= 0.75);
    if (matched.length) out.push({ type, mentions: matched.slice(0, 8), confidence: Math.min(1, 0.6 + matched.length * 0.08) });
  }
  return out;
}

function inferClaim(text: string): Loose {
  const raw = String(text ?? '');
  const quoted = raw.match(/["“”](.*?)["“”]/);
  const refs = [...raw.matchAll(/\b(?:Q\s*)?\d{1,3}:\d{1,3}(?:-\d{1,3})?\b/gi)].map(m => m[0].replace(/^Q\s*/i, ''));
  return { text: quoted?.[1] ?? null, referenceCandidates: refs, sourceCandidates: /\b(quran|al[- ]quran|taurat|torah|injil|bible|hadith|hadis|tafsir)\b/i.test(raw) ? ['SCRIPTURE_OR_RELIGIOUS_SOURCE'] : [] };
}

function inferDomains(text: string, ontology: Loose): Record<string, number> {
  const t = compact(text); const result: Record<string, number> = {};
  for (const [domain, aliases] of Object.entries(ontology?.domains ?? {})) {
    const hits = (Array.isArray(aliases) ? aliases : []).filter((x: string) => t.includes(compact(x))).length;
    if (hits) result[domain] = Math.min(1, 0.45 + hits * 0.15);
  }
  return result;
}


function inferGates(text: string, ontology: Loose, confidence: number): number[] {
  const axes = ontology?.vectors?.actionGate?.axes ?? []; const t = compact(text);
  const signals = ontology?.contextSignals ?? {};
  return Array.from({ length: Number(ontology?.vectors?.actionGate?.length ?? 9) }, (_, i) => {
    const axis = axes[i] ?? {}; const aliases = Array.isArray(axis.aliases) ? axis.aliases : [];
    const hits = aliases.filter((x: string) => t.includes(compact(x))).length;
    if (axis.strategy === 'KNOWLEDGE') {
      const verified = countSignal(t, ['bukti','data','cek','verifikasi','cross check','kroscek','memastikan']) > 0;
      return clamp01(verified ? Math.max(0.75, confidence) : hits ? Math.max(0.35, confidence * 0.65) : 0);
    }
    if (axis.strategy === 'INTENTION') {
      if (countSignal(t, signals.mistake) > 0) return 0.2;
      if (countSignal(t, signals.intentional) > 0) return 0.9;
      return hits ? 0.45 : 0;
    }
    if (axis.strategy === 'CONTEXT') return clamp01(hits ? Math.min(1, hits * 0.35) : 0);
    return clamp01(hits ? Math.min(1, hits * 0.35) : 0);
  });
}

function inferEpistemicSignals(text: string, ontology: Loose): Loose {
  const t = compact(text); const s = ontology?.contextSignals ?? {};
  return {
    intentional: countSignal(t, s.intentional) > 0,
    mistake: countSignal(t, s.mistake) > 0,
    coercion: countSignal(t, s.coercion) > 0,
    capacityLimited: countSignal(t, s.capacityLimited) > 0,
    reservedUnseen: countSignal(t, s.reservedUnseen) > 0
  };
}

function inferTime(text: string, ontology: Loose): Loose {
  const t = compact(text); const signals = ontology?.timeSignals ?? {};
  const recurring = countSignal(t, signals.recurring) > 0; const future = countSignal(t, signals.future) > 0; const past = countSignal(t, signals.past) > 0;
  return { status: 'INFERRED', recurrence: recurring ? 'RECURRING' : 'SINGLE_OR_UNSPECIFIED', tense: future ? 'FUTURE' : past ? 'PAST' : 'PRESENT_OR_UNSPECIFIED', intensity: recurring ? 0.8 : 0.35 };
}

function inferCausality(text: string, confidence: number): Loose {
  const causal = /\bkarena|sehingga|akibat|menyebabkan|supaya|agar|demi\b/.test(compact(text));
  return { causal_strength: causal ? Math.min(1, confidence + 0.05) : confidence * 0.55, confidence, status: 'INFERRED' };
}

function inferScale(text: string, ontology: Loose): Loose {
  const t = compact(text); const signals = ontology?.scaleSignals ?? {};
  const ranked = Object.entries(signals).map(([scope, aliases]) => ({ scope, hits: (Array.isArray(aliases) ? aliases : []).filter((x: string) => t.includes(compact(x))).length })).sort((a, b) => b.hits - a.hits);
  const scope = ranked[0]?.hits ? ranked[0].scope : 'SELF'; const reachByScope = ontology?.scopeReach ?? {};
  return { scope, reach: Number(reachByScope[scope] ?? reachByScope.SELF ?? 0.2), intent: 0.7, quality: 0.6, context: 0.6, evidence: 0.2 };
}

function inferComposition(text: string, candidates: Array<{ action: string; score: number; matchedAlias: string; negated: boolean }>, ontology: Loose): Loose {
  const t = compact(text);
  const negations = (Array.isArray(ontology?.contextSignals?.negation) ? ontology.contextSignals.negation : []).filter((x: string) => t.includes(compact(x)));
  const restitution = (Array.isArray(ontology?.contextSignals?.restitution) ? ontology.contextSignals.restitution : []).filter((x: string) => t.includes(compact(x)));
  const beneficial = (Array.isArray(ontology?.contextSignals?.beneficial) ? ontology.contextSignals.beneficial : []).filter((x: string) => t.includes(compact(x)));
  const support = (Array.isArray(ontology?.contextSignals?.support) ? ontology.contextSignals.support : []).filter((x: string) => t.includes(compact(x)));
  const outcome = restitution.length ? 'RESTITUTION_OR_RETURN' : beneficial.length || support.length ? 'BENEFICIAL_OR_SUPPORTIVE' : 'UNSPECIFIED';
  const rejected = candidates.filter(c => c.negated || ((c.action === 'THEFT' || c.action === 'CORRUPTION' || c.action === 'DEFAMATION' || c.action === 'LYING') && restitution.length > 0));
  const viable = candidates.filter(c => !rejected.some(r => r.action === c.action));
  return {
    actor: null,
    intent: { status: 'INFERRED', goalSignals: [...beneficial, ...support, ...restitution].slice(0, 8) },
    negationSignals: negations,
    outcome,
    restitutionSignals: restitution,
    beneficialSignals: [...beneficial, ...support].slice(0, 8),
    candidates: candidates.slice(0, 6),
    rejectedCandidates: rejected.map(c => ({ ...c, reason: restitution.length ? 'CONTEXT_OUTCOME_CONTRADICTION' : 'NEGATED' })),
    viableCandidates: viable.slice(0, 6),
    eventSegments: [{ text, relation: 'PRIMARY_EVENT' }]
  };
}

export class RegistrySemanticProvider {
  readonly name = 'moonwitness-registry-semantic';
  readonly capabilities = ['semantic-contract', 'semantic-event-graph', 'moral-lifecycle', 'event-conflict-resolution', 'revelation-native-binding', 'revelation-grounded-magnitude', 'offline', 'deterministic', 'context-composition'];
  private readonly root: string; private readonly data: SemanticEngineData;
  constructor(root = process.cwd()) { this.root = path.resolve(root); this.data = getData(this.root); }

  async analyze(text: string, options: Loose = {}): Promise<Loose> {
    const raw = String(text ?? '').trim();
    if (!raw) return { status: 'UNKNOWN', intention: { label: 'UNRESOLVED', confidence: 0, rgbl: { R: 0, G: 0, B: 0, L: 0 } } };
    const candidates = findActionCandidates(raw, this.data);
    const composition = inferComposition(raw, candidates, this.data.ontology);
    const selected = composition.viableCandidates[0];
    const eventGraph = parseSemanticEventGraph(raw);
    const eventInterpretation = interpretSemanticEventGraph({ graph: eventGraph, semanticRegistry: this.data.ontology, root: this.root });
    const moralLifecycle = buildMoralLifecycle({ graph:eventGraph, eventInterpretation, root:this.root });
    const directScore = selected?.score ?? 0;
    const contextPenalty = composition.rejectedCandidates.length && selected ? 0.1 : 0;
    const legacySemanticConfidence = selected ? Math.max(0, Math.min(0.96, 0.50 + directScore * 0.42 - contextPenalty)) : 0;
    const semanticConfidence = Math.max(legacySemanticConfidence, Number(eventInterpretation?.composite?.confidence ?? 0));
    const entities = inferEntities(raw, this.data);
    const claim = inferClaim(raw);
    const scale = inferScale(raw, this.data.ontology);
    const baseEpistemicSignals = inferEpistemicSignals(raw, this.data.ontology);
    const epistemicSignals: Loose = { ...baseEpistemicSignals, mistake: baseEpistemicSignals.mistake || eventGraph.summary.hasMistake, coercion: baseEpistemicSignals.coercion || eventGraph.summary.hasCoercion, capacityLimited: baseEpistemicSignals.capacityLimited || eventGraph.nodes.some((n: Loose) => n.context?.capacityLimited), permission: eventGraph.summary.hasPermission, responsibilityFactor: eventInterpretation.composite.violationResponsibilityFactor };
    const interpretedActions = eventInterpretation.events.map((e: Loose) => e.action);
    const eventGraphHasActionSurface = eventGraph.nodes.some((n: Loose) => Array.isArray(n.actions) && n.actions.length > 0);
    const action = interpretedActions.length > 1 ? 'COMPOSITE_EVENT' : interpretedActions[0] ?? (eventGraphHasActionSurface ? 'UNRESOLVED' : selected?.action) ?? 'UNRESOLVED';
    const status = interpretedActions.length || eventGraphHasActionSurface || selected ? 'INFERRED' : 'UNKNOWN';
    const useEventInterpretation = eventInterpretation.events.length > 0 || eventGraphHasActionSurface;
    const revelationBinding = useEventInterpretation ? eventInterpretation.binding : bindActionToRevelation({ action, text: raw, root: this.root });
    const revelationSignals = useEventInterpretation ? (eventInterpretation.events.length===1 ? eventInterpretation.events[0].signals : eventInterpretation.composite.revelationSignals) : deriveRevelationMagnitudeSignals({ binding: revelationBinding, semanticRegistry: this.data.ontology, root: this.root });
    const vector = revelationSignals.rgbl;
    const impacts = revelationSignals.impactVector;
    const domains = inferDomains(raw, this.data.ontology);
    const gates = inferGates(raw, this.data.ontology, semanticConfidence);
    const reflectionSignals = this.data.ontology?.modeSignals?.REFLECTION ?? [];
    const explicitReflection = Array.isArray(reflectionSignals) && reflectionSignals.some((signal: string) => compact(raw).includes(compact(signal)));
    const mode = explicitReflection || revelationBinding.direction === 'POSITIVE' ? 'REFLECTION' : revelationBinding.direction === 'NEGATIVE' ? 'DEVIATION' : 'UNKNOWN';
    const quality = selected ? Math.min(1, 0.45 + directScore * 0.5) : 0;
    const quranGrounding = {
      coverage: revelationBinding.coverage,
      direct: revelationBinding.direct,
      principles: revelationBinding.principles,
      note: revelationBinding.boundary,
      empiricalRequired: revelationBinding.empiricalRequired,
      source: revelationBinding.status,
      pureNormativeDerivation: revelationBinding.pureNormativeDerivation
    };
    return {
      status, mode, action,
      actionMatch: selected ? { alias: selected.matchedAlias, score: selected.score } : null,
      actionCandidates: candidates,
      composition,
      confidence: semanticConfidence,
      semanticConfidence,
      contextConfidence: composition.rejectedCandidates.length ? 0.72 : (selected ? 0.88 : 0.25),
      intention: {
        label: action,
        state: epistemicSignals.mistake ? 'MISTAKE_SIGNAL' : epistemicSignals.coercion ? 'COERCION_SIGNAL' : epistemicSignals.intentional ? 'DECLARED_INTENT_SIGNAL' : status,
        confidence: semanticConfidence,
        heartKnown: false,
        evidence_refs: ['Q33:5','Q2:225'],
        rgbl: { R: clamp(vector.R), G: clamp(vector.G), B: clamp(vector.B), L: clamp(vector.L) },
        chain: (['R', 'G', 'B', 'L'] as const).map((axis, index, all) => ({ axis, value: clamp(vector[axis]), status, confidence: Math.max(0, semanticConfidence - index * 0.03), evidence_refs: [], derives_from: all.slice(0, index) }))
      },
      entities,
      contexts: { jurisdiction: options.jurisdiction ?? null },
      claim,
      actionGateVector: gates,
      impactVector: impacts,
      quranGrounding,
      revelationBinding,
      revelationSignals,
      epistemicSignals,
      timeFactor: inferTime(raw, this.data.ontology),
      causality: inferCausality(raw, semanticConfidence),
      domainVector: domains,
      scale,
      evidence: [], alternatives: composition.viableCandidates.slice(1), conflicts: eventInterpretation.conflicts, timeline: eventGraph.nodes.map((n: Loose) => ({ sequence: n.sequence, phase: n.occurrence, relation: n.connector, eventId: n.id, actionCandidates: n.actions.filter((a: Loose) => !a.suppressed).map((a: Loose) => a.action) })),
      eventGraph, eventInterpretation, moralLifecycle,
      revelationAsma: { engine: 'PURE_REVELATION_ASMA_V1', actionBinding: revelationBinding.status, status: revelationBinding.pureNormativeDerivation ? 'REVELATION_BOUND' : 'UNRESOLVED_FOR_ACTION', normativeAuthority: true },
      quality,
      sourcePolicy: { mode: scriptureSourcePolicy()?.mode ?? 'FOUR_BOOKS_ONLY', normativeBooks: ['QURAN','TAWRAT','ZABUR','INJIL'], externalNormativeWeight: 0 },
      legacyBridge: { actionAliasUsed: Boolean(selected), normativeAuthority: false, verseMappingUsed: false, magnitudeUsed: false, eventParserUsed: true, note: 'Alias registries and event-language profiles are language parsing bridges only. They do not contain verse mappings, moral direction, RGBL magnitude, or OUT impact values.' },
      sourceNotes: interpretedActions.length
        ? [`EventGraph state=${eventInterpretation.state}`, `events=${interpretedActions.join(',')}`, `eventCount=${eventGraph.summary.eventCount}`, 'Normative source policy=FOUR_BOOKS_ONLY']
        : selected
          ? [`Registry candidate=${selected.action}`, `alias=${selected.matchedAlias}`, `score=${selected.score.toFixed(3)}`, `contextOutcome=${composition.outcome}`, 'Normative source policy=FOUR_BOOKS_ONLY']
          : ['No viable event/action candidate; semantic result remains unresolved.', 'Normative source policy=FOUR_BOOKS_ONLY']
    };
  }
}

export function createDefaultSemanticProvider(root = process.cwd()): RegistrySemanticProvider { return new RegistrySemanticProvider(root); }
export function resetSemanticEngineCache(): void { cached = null; }
