export type ExplanationRecord = Record<string, unknown>;

export interface TemporalExplanation {
  classification: 'TEMPORAL_CONTEXT' | 'THEOLOGICAL_BOUNDARY';
  astronomicalFacts: ExplanationRecord;
  mathematicalDerivations: ExplanationRecord;
  quranicEvidence: { status: 'DOMAIN_EVIDENCE_MUST_BE_SUPPLIED_SEPARATELY'; timestampSpecific: false };
  researchHypotheses: { status: 'SIGNALS_ONLY_NOT_REVEALED_RULES'; automaticBaseScoreBonus: false };
  uncertainty: ExplanationRecord;
  boundary: string;
}

const rewardRequest = /\b(pahala|reward|dosa|sin|Allah memberi|paling besar|pasti berdosa|waktu terbaik|jam kejahatan)\b/i;

/**
 * Explains a supplied TSE context without turning analytical values into theology.
 * Invalid or absent TSE contexts intentionally return null.
 */
export function explainTemporalContext(text: string, timeFactor: ExplanationRecord): TemporalExplanation | null {
  if (timeFactor?.schema !== 'MIZAN_TEMPORAL_CONTEXT_V1') return null;
  const state = asRecord(timeFactor.temporalState);
  const solar = asRecord(state.solar);
  const lunar = asRecord(state.lunar);
  const night = asRecord(state.night);
  const provenance = asRecord(timeFactor.provenance);
  const theologicalBoundary = rewardRequest.test(text);
  return {
    classification: theologicalBoundary ? 'THEOLOGICAL_BOUNDARY' : 'TEMPORAL_CONTEXT',
    astronomicalFacts: {
      timestampUtc: timeFactor.timestampUtc,
      solar: { altitudeDeg: solar.altitudeDeg, sunriseUtc: solar.sunriseUtc, sunsetUtc: solar.sunsetUtc },
      lunar: { altitudeDeg: lunar.altitudeDeg, illuminationFraction: lunar.illuminationFraction, moonriseUtc: lunar.moonriseUtc, moonsetUtc: lunar.moonsetUtc },
    },
    mathematicalDerivations: { nightSegment: night.segment, nightFractionElapsed: night.fractionElapsed, finalThird: night.finalThird },
    quranicEvidence: { status: 'DOMAIN_EVIDENCE_MUST_BE_SUPPLIED_SEPARATELY', timestampSpecific: false },
    researchHypotheses: { status: 'SIGNALS_ONLY_NOT_REVEALED_RULES', automaticBaseScoreBonus: false },
    uncertainty: { confidence: asRecord(timeFactor.signals).confidence ?? null, provider: provenance.provider ?? null, unsupportedEventsRemainUnresolved: true },
    boundary: theologicalBoundary
      ? 'Cosmic cannot determine literal pahala, dosa, divine reward, punishment, or a best time guaranteed by Allah. It can only describe analytical astronomical and temporal context.'
      : 'This is analytical astronomical context. It is not a measure of divine reward, punishment, unseen knowledge, or final judgement.',
  };
}

export interface LegalExplanation {
  query: unknown;
  jurisdiction: unknown;
  classification: unknown;
  legalStatus: unknown;
  religiousAuthority: unknown;
  civilRule: unknown;
  semanticPrimary: unknown;
  note: string;
}

/** Formats an existing legal analysis for display; it does not produce legal advice. */
export function explainLegalResult(result: ExplanationRecord): LegalExplanation {
  const legal = asRecord(result.legal);
  const religious = asRecord(legal.religious);
  const civil = asRecord(legal.civil);
  const semantic = asRecord(result.semantic);
  const asma = asRecord(semantic.asma);
  const primary = asRecord(asma.primary);
  return {
    query: result.query,
    jurisdiction: result.jurisdiction,
    classification: result.action,
    legalStatus: legal.status,
    religiousAuthority: religious.sourceAuthority ?? null,
    civilRule: civil.note ?? null,
    semanticPrimary: primary.name ?? null,
    note: 'This is a decision-support explanation, not legal advice or a judicial verdict.',
  };
}

function asRecord(value: unknown): ExplanationRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as ExplanationRecord : {};
}
