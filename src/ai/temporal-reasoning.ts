type Loose = Record<string, unknown>;

const rewardRequest = /\b(pahala|reward|dosa|sin|Allah memberi|paling besar|pasti berdosa|waktu terbaik|jam kejahatan)\b/i;

/** Explains a supplied TSE context without converting its analytical values into theology. */
export function explainTemporalContext(text: string, timeFactor: Loose): Loose | null {
  if (timeFactor?.schema !== 'MIZAN_TEMPORAL_CONTEXT_V1') return null;
  const state = (timeFactor.temporalState ?? {}) as Loose;
  const solar = (state.solar ?? {}) as Loose;
  const lunar = (state.lunar ?? {}) as Loose;
  const night = (state.night ?? {}) as Loose;
  const provenance = (timeFactor.provenance ?? {}) as Loose;
  return {
    classification: rewardRequest.test(text) ? 'THEOLOGICAL_BOUNDARY' : 'TEMPORAL_CONTEXT',
    astronomicalFacts: {
      timestampUtc: timeFactor.timestampUtc,
      solar: { altitudeDeg: solar.altitudeDeg, sunriseUtc: solar.sunriseUtc, sunsetUtc: solar.sunsetUtc },
      lunar: { altitudeDeg: lunar.altitudeDeg, illuminationFraction: lunar.illuminationFraction, moonriseUtc: lunar.moonriseUtc, moonsetUtc: lunar.moonsetUtc },
    },
    mathematicalDerivations: { nightSegment: night.segment, nightFractionElapsed: night.fractionElapsed, finalThird: night.finalThird },
    quranicEvidence: { status: 'DOMAIN_EVIDENCE_MUST_BE_SUPPLIED_SEPARATELY', timestampSpecific: false },
    researchHypotheses: { status: 'SIGNALS_ONLY_NOT_REVEALED_RULES', automaticBaseScoreBonus: false },
    uncertainty: { confidence: (timeFactor.signals as Loose | undefined)?.confidence ?? null, provider: provenance.provider ?? null, unsupportedEventsRemainUnresolved: true },
    boundary: rewardRequest.test(text)
      ? 'Cosmic cannot determine literal pahala, dosa, divine reward, punishment, or a best time guaranteed by Allah. It can only describe analytical astronomical and temporal context.'
      : 'This is analytical astronomical context. It is not a measure of divine reward, punishment, unseen knowledge, or final judgement.',
  };
}
