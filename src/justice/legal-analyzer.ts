import { runtimeDataset } from '../persistence/runtime-data.js';
import crypto from 'node:crypto';

type SemanticObservation = {
  action?: string;
  context?: Record<string, unknown>;
};

type AnalyzerInput = {
  text?: string;
  semanticObservation?: SemanticObservation;
  jurisdiction?: string;
  sourceProfile?: string;
};

const getRules = () => runtimeDataset('data/justice/rules.json') as any;
const getSources = () => runtimeDataset('data/justice/sources-2026.json');
const getRegistry = () => runtimeDataset('data/registries/action-semantics.json') as any;
const uid = (p: string) => `${p}_${crypto.randomUUID()}`;
const clamp = (n: number, a = -1, b = 1) => Math.max(a, Math.min(b, Number.isFinite(n) ? n : 0));

export function createRuh() { return { ruhId: uid('RUH'), state: 'DUNYA', alive: true }; }

export function classifyText(_text = '', observation?: SemanticObservation) {
  const action = observation?.action ?? 'UNKNOWN';
  const context = observation?.context ?? {};
  return { action, context };
}

export function legacyActionProfile(action: string) {
  const registry = getRegistry();
  const m = registry.actions[action] ?? { vector: { R: 0, G: 0, B: 0, L: 0 }, harm: {} };
  return {
    vector: Object.fromEntries(Object.entries(m.vector ?? {}).map(([k, v]) => [k, clamp(Number(v))])),
    harm: m.harm ?? {},
    normativeAuthority: false,
    note: 'Legacy action registry is retained only as an engineering/language bridge; it is not an Asma or revelation authority.'
  };
}

export function analyzeLaw({ text = '', semanticObservation, jurisdiction = 'UNSPECIFIED', sourceProfile = 'DEFAULT' }: AnalyzerInput = {}) {
  const c = classifyText(text, semanticObservation);
  const a = legacyActionProfile(c.action);
  const rules = getRules();
  const religious = c.action === 'UNKNOWN' ? null : rules.religiousRules?.find((x: any) => x.topic === c.action) ?? null;
  const civil = rules.civilExamples?.find((x: any) => x.topic === c.action && x.jurisdiction === jurisdiction) ?? null;
  const legalStatus = c.action === 'UNKNOWN' ? 'UNRESOLVED' : (jurisdiction === 'UNSPECIFIED' ? 'JURISDICTION_REQUIRED' : 'CONTEXT_DEPENDENT');
  const severityBase = Object.values(a.harm as Record<string, unknown>).reduce<number>((s, v) => s + Number(v), 0);
  const severity = severityBase >= 2.5 ? 30 : severityBase >= 1.2 ? 12 : severityBase > 0 ? 4 : 0;
  const modelScore = Number((severity * (1 + Math.max(0, Math.abs(Number(a.vector.B))) + Math.max(0, Math.abs(Number(a.vector.L))))).toFixed(2));
  return {
    query: text,
    jurisdiction,
    sourceProfile,
    action: c.action,
    sources: getSources(),
    context: c.context,
    legal: { status: legalStatus, religious, civil },
    semantic: { legacyActionProfile: a, directions: a.vector, asmaAuthority: 'PURE_REVELATION_ASMA_ENGINE_ONLY' },
    harm: a.harm,
    severity,
    modelScore,
    status: semanticObservation ? 'SEMANTIC_INPUT' : 'UNRESOLVED',
    disclaimer: 'Decision-support model only; verify current official law and source authority for real-world action.'
  };
}

export const Roles = {
  POLICE: ['receive_report', 'protect', 'investigate', 'secure_evidence', 'submit_case'],
  PROSECUTOR: ['review_case', 'select_charge', 'prosecute'],
  DEFENSE: ['advise', 'challenge_evidence', 'present_defense', 'appeal'],
  COURT: ['manage_trial', 'assess_evidence', 'find_fact', 'interpret_law', 'verdict', 'sentence']
};
