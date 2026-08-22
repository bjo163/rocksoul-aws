import { runtimeDatasetOr } from '../persistence/runtime-data.js';

type Loose = Record<string, any>;
const clamp01 = (v: unknown, fallback = 0): number => { const n = Number(v); return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : fallback; };
const norm = (v: unknown) => String(v ?? '').toLowerCase().normalize('NFKC');
const hasAny = (text: string, xs: unknown) => (Array.isArray(xs) ? xs : []).some(x => norm(text).includes(norm(x)));

function registry(): Loose {
  return runtimeDatasetOr('data/mizan/quranic-principles.json', { version: 'unknown', principles: [] }) as Loose;
}
function principleMap(reg: Loose): Map<string, Loose> {
  return new Map((Array.isArray(reg?.principles) ? reg.principles : []).map((p: Loose) => [String(p.id), p]));
}
function groundingRefs(grounding: Loose = {}): string[] {
  return [...new Set([...(grounding.direct ?? []), ...(grounding.principles ?? [])].map(String))];
}
function evidenceState(observed: Loose): { state: string; count: number; verified: number } {
  const evidence = Array.isArray(observed?.evidence) ? observed.evidence : [];
  const verified = evidence.filter((e: any) => typeof e === 'object' && ['VERIFIED','CONFIRMED','CORROBORATED'].includes(String(e?.status ?? '').toUpperCase())).length;
  if (verified) return { state: 'VERIFIED', count: evidence.length, verified };
  if (evidence.length) return { state: 'SUPPORTED_NOT_VERIFIED', count: evidence.length, verified: 0 };
  if (observed?.status === 'INFERRED') return { state: 'UNVERIFIED_REPORT', count: 0, verified: 0 };
  return { state: 'INSUFFICIENT', count: 0, verified: 0 };
}
function intentionAssessment(text: string, observed: Loose, principles: Map<string, Loose>): Loose {
  const signals = observed?.epistemicSignals ?? {};
  const explicitIntent = Boolean(signals.intentional) || /\b(sengaja|berniat|bermaksud)\b/i.test(text);
  const mistake = Boolean(signals.mistake) || /\b(tidak sengaja|tanpa sengaja|keliru|khilaf)\b/i.test(text);
  const coercion = Boolean(signals.coercion) || /\b(dipaksa|terpaksa|diancam|di bawah tekanan)\b/i.test(text);
  const state = mistake ? 'MISTAKE_SIGNAL' : coercion ? 'COERCION_SIGNAL' : explicitIntent ? 'DECLARED_INTENT_SIGNAL' : observed?.status === 'INFERRED' ? 'INFERRED' : 'UNKNOWN';
  return {
    state,
    label: observed?.intention?.label ?? observed?.intent ?? 'UNRESOLVED',
    confidence: clamp01(observed?.intention?.confidence ?? observed?.confidence ?? 0),
    heartKnown: false,
    refs: principles.get('INTENT_DISTINCTION')?.refs ?? ['Q33:5','Q2:225'],
    boundary: 'Software may analyze declared/contextual intention signals; it does not know the heart.'
  };
}
function responsibilityAssessment(observed: Loose, principles: Map<string, Loose>): Loose {
  const s = observed?.epistemicSignals ?? {};
  const coercion = Boolean(s.coercion);
  const mistake = Boolean(s.mistake);
  const capacityLimited = Boolean(s.capacityLimited);
  // Engineering factor, deliberately not presented as a revealed weight.
  let factor = 1;
  if (coercion) factor *= 0.55;
  if (mistake) factor *= 0.60;
  if (capacityLimited) factor *= 0.75;
  return {
    factor: Number(factor.toFixed(4)),
    coercion, mistake, capacityLimited,
    burdenTransferAllowed: false,
    refs: [...new Set([
      ...(principles.get('CAPACITY')?.refs ?? []),
      ...(coercion ? principles.get('COERCION_CONTEXT')?.refs ?? [] : []),
      ...(principles.get('INDIVIDUAL_RESPONSIBILITY')?.refs ?? [])
    ])],
    boundary: 'factor is an engineering attenuation for analytical responsibility, not a divine accounting formula.'
  };
}

export function evaluateQuranicMizan({ text = '', observed = {}, mizan = null, conflicts = [], eventInterpretation = null }: Loose = {}): Loose {
  const reg = registry();
  const p = principleMap(reg);
  const grounding = observed?.quranGrounding ?? {};
  const groundingCoverage = String(grounding?.coverage ?? 'NONE').toUpperCase();
  const normativeRefs = groundingRefs(grounding);
  const ev = evidenceState(observed);
  const confidence = clamp01(observed?.confidence ?? 0);
  const unresolved = !observed?.intent || observed.intent === 'UNRESOLVED' || observed?.status === 'UNKNOWN';
  const reservedSignal = Boolean(observed?.epistemicSignals?.reservedUnseen) || /\b(neraka|surga|akhirat|isi hati sebenarnya|allah pasti menghukum|allah pasti menerima)\b/i.test(String(text));
  const actualConflict = Boolean(eventInterpretation?.conflictResolution?.blockingMizan) ||
    (Array.isArray(conflicts) ? conflicts : []).some((c: Loose) => String(c?.status).toUpperCase() === 'ACTUAL_CONFLICT');

  let status: 'ESTABLISHED'|'PROVISIONAL'|'INSUFFICIENT_EVIDENCE'|'RESERVED';
  if (reservedSignal) status = 'RESERVED';
  else if (unresolved || confidence < 0.34 || groundingCoverage === 'NONE') status = 'INSUFFICIENT_EVIDENCE';
  else if (ev.state === 'VERIFIED' && ['DIRECT','MIXED'].includes(groundingCoverage) && confidence >= 0.75 && !actualConflict) status = 'ESTABLISHED';
  else status = 'PROVISIONAL';

  const applied = ['MIZAN_BALANCE','JUSTICE_WITNESS','KNOWLEDGE_BOUNDARY','INTENT_DISTINCTION','INDIVIDUAL_RESPONSIBILITY','DEED_GRANULARITY','RECORD_COMPLETENESS','FINAL_JUDGMENT_RESERVED'];
  if (ev.state !== 'VERIFIED') applied.push('VERIFY_REPORTS');
  if (observed?.epistemicSignals?.coercion) applied.push('COERCION_CONTEXT');
  if (observed?.epistemicSignals?.capacityLimited) applied.push('CAPACITY');

  const responsibility = responsibilityAssessment(observed, p);
  const intention = intentionAssessment(String(text), observed, p);
  const risk = clamp01(mizan?.assessment?.risk ?? 0);
  const benefit = clamp01((mizan?.assessment?.positiveScore ?? 0) / 100);
  const impactClass = risk > benefit + 0.12 ? 'HARM_SIGNAL' : benefit > risk + 0.12 ? 'BENEFIT_SIGNAL' : (risk || benefit) ? 'MIXED_SIGNAL' : 'UNRESOLVED';

  return {
    protocol: 'QURANIC_MIZAN_ANALYTICAL_V1',
    version: reg?.version ?? 'unknown',
    status,
    conditional: status === 'PROVISIONAL',
    conditionalFinding: status === 'PROVISIONAL' ? 'Assessment is conditional on the described facts being accurate and should not be used to harm a person without verification.' : null,
    epistemic: {
      evidenceState: ev.state,
      evidenceCount: ev.count,
      verifiedEvidenceCount: ev.verified,
      actionConfidence: confidence,
      sourceGrounding: groundingCoverage,
      knowledgeBoundary: p.get('KNOWLEDGE_BOUNDARY')?.refs ?? ['Q17:36'],
      verificationRequired: ev.state !== 'VERIFIED',
      conflictPresent: actualConflict
    },
    conflictResolution: eventInterpretation?.conflictResolution ?? null,
    quranGrounding: { coverage: groundingCoverage, refs: normativeRefs, note: grounding?.note ?? null, empiricalRequired: Boolean(grounding?.empiricalRequired) },
    intention,
    responsibility,
    balance: {
      impactClass,
      harmSignal: risk,
      benefitSignal: benefit,
      modelRisk: risk,
      modelBenefit: benefit,
      retainBothChannels: true,
      engineeringNetIsDivineCancellationRule: false,
      numericBoundary: 'Numeric values are software heuristics for comparison/audit; the Qur\'an does not supply these software weights. Harm and benefit remain separately visible; any legacy net score is not a revealed cancellation rule.'
    },
    principlesApplied: [...new Set(applied)].map(id => p.get(id)).filter(Boolean),
    reserved: {
      heartTruth: true,
      finalDivineWeighing: true,
      finalFaithState: true,
      finalDestination: true,
      refs: p.get('FINAL_JUDGMENT_RESERVED')?.refs ?? ['Q21:47','Q53:32']
    },
    modelOnly: true,
    divineVerdict: false
  };
}
