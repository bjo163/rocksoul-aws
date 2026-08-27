import type { HypothesisDatasetRole, HypothesisOutcome, TemporalHypothesisId } from './hypothesis-registry.js';

export const TEMPORAL_SCORING_PROFILE_VERSION = 'TSE_TEMPORAL_SCORING_V1' as const;

export interface ConfidenceInterval {
  readonly lower: number;
  readonly upper: number;
  readonly level: 0.95;
}

/** Deterministic statistics emitted for every hypothesis/dataset result. */
export interface TemporalHypothesisStatistics {
  readonly datasetRole: HypothesisDatasetRole;
  readonly sampleSize: number;
  readonly pValue: number;
  readonly adjustedPValue: number;
  readonly multipleTestingCorrection: 'BONFERRONI';
  readonly hypothesisCount: number;
  readonly effectSize: number;
  readonly confidenceInterval: ConfidenceInterval;
  readonly riskRatio: number | null;
}

export interface TemporalHypothesisResult {
  readonly hypothesisId: TemporalHypothesisId;
  readonly outcome: HypothesisOutcome;
  readonly statistics: TemporalHypothesisStatistics;
  readonly interpretation: 'RESEARCH_SIGNAL_ONLY';
  readonly affectsBaseTemporalRelevance: false;
  readonly boundary: string;
}

export interface TemporalScoreInput {
  readonly temporalRelevance: number;
  readonly evidenceStrength: number;
  /** Retained as a separately reportable research signal, never added to relevance. */
  readonly hypothesisSignal: number;
  readonly confidence: number;
  readonly dataQuality: number;
  readonly astronomicalDataStatus?: 'RESOLVED' | 'UNRESOLVED';
}

export interface TemporalScore {
  readonly profileVersion: typeof TEMPORAL_SCORING_PROFILE_VERSION;
  readonly status: 'RESOLVED' | 'UNRESOLVED';
  readonly temporalRelevance: number;
  readonly evidenceStrength: number;
  readonly hypothesisSignal: number;
  readonly confidence: number;
  readonly dataQuality: number;
  readonly confidenceAdjustedScore: number | null;
  readonly baseScore: number | null;
  readonly hypothesisAffectsBaseTemporalRelevance: false;
  readonly scoreIsAnalytical: true;
  readonly scoreIsNotDivineReward: true;
  readonly provenance: {
    readonly formula: 'temporalRelevance × evidenceStrength × confidence × dataQuality';
    readonly hypothesisHandling: 'REPORTED_SEPARATELY_NOT_ADDED_TO_BASE_SCORE';
    readonly evidenceHandling: 'DOMAIN_EVIDENCE_IS_NOT_TIMESTAMP_SPECIFIC_STATE_EVIDENCE';
  };
}

export interface TemporalScoringSensitivityScenario {
  readonly id: string;
  readonly confidenceWeight: number;
  readonly dataQualityWeight: number;
}

export interface TemporalScoringSensitivityResult {
  readonly id: string;
  readonly confidenceAdjustedScore: number | null;
}

const boundary = 'Scores are deterministic analytical software metrics, not literal divine reward, punishment, unseen knowledge, or final judgement.';

function unit(value: number, name: string): number {
  if (!Number.isFinite(value) || value < 0 || value > 1) throw new Error(`TSE_SCORE_${name}_MUST_BE_UNIT_INTERVAL`);
  return Number(value.toFixed(6));
}

function round(value: number): number {
  return Number(value.toFixed(6));
}

/**
 * Classifies a precomputed statistical result using fixed, declared rules.
 * No thresholds are inferred from the dataset under test.
 */
export function determineHypothesisOutcome(statistics: TemporalHypothesisStatistics): HypothesisOutcome {
  validateStatistics(statistics);
  if (statistics.adjustedPValue <= 0.05 && statistics.confidenceInterval.lower > 0 && statistics.effectSize > 0) return 'SUPPORTED';
  if (statistics.adjustedPValue <= 0.05 && statistics.confidenceInterval.upper < 0 && statistics.effectSize < 0) return 'CONTRADICTED';
  return 'INCONCLUSIVE';
}

export function createTemporalHypothesisResult(
  hypothesisId: TemporalHypothesisId,
  statistics: TemporalHypothesisStatistics,
): TemporalHypothesisResult {
  return Object.freeze({
    hypothesisId,
    outcome: determineHypothesisOutcome(statistics),
    statistics: Object.freeze({ ...statistics, confidenceInterval: Object.freeze({ ...statistics.confidenceInterval }) }),
    interpretation: 'RESEARCH_SIGNAL_ONLY',
    affectsBaseTemporalRelevance: false,
    boundary,
  });
}

export function calculateTemporalScore(input: TemporalScoreInput): TemporalScore {
  const temporalRelevance = unit(input.temporalRelevance, 'TEMPORAL_RELEVANCE');
  const evidenceStrength = unit(input.evidenceStrength, 'EVIDENCE_STRENGTH');
  const hypothesisSignal = unit(input.hypothesisSignal, 'HYPOTHESIS_SIGNAL');
  const confidence = unit(input.confidence, 'CONFIDENCE');
  const dataQuality = unit(input.dataQuality, 'DATA_QUALITY');
  const unresolved = input.astronomicalDataStatus === 'UNRESOLVED';
  // Deliberately omit hypothesisSignal: it cannot alter the base relevance score.
  const baseScore = unresolved ? null : round(temporalRelevance * evidenceStrength);
  const confidenceAdjustedScore = unresolved ? null : round((baseScore ?? 0) * confidence * dataQuality);
  return Object.freeze({
    profileVersion: TEMPORAL_SCORING_PROFILE_VERSION,
    status: unresolved ? 'UNRESOLVED' : 'RESOLVED',
    temporalRelevance, evidenceStrength, hypothesisSignal, confidence, dataQuality,
    baseScore, confidenceAdjustedScore,
    hypothesisAffectsBaseTemporalRelevance: false,
    scoreIsAnalytical: true,
    scoreIsNotDivineReward: true,
    provenance: Object.freeze({
      formula: 'temporalRelevance × evidenceStrength × confidence × dataQuality',
      hypothesisHandling: 'REPORTED_SEPARATELY_NOT_ADDED_TO_BASE_SCORE',
      evidenceHandling: 'DOMAIN_EVIDENCE_IS_NOT_TIMESTAMP_SPECIFIC_STATE_EVIDENCE',
    }),
  });
}

/** Fixed scenario evaluation for transparent weight sensitivity, without mutating the profile. */
export function analyzeTemporalScoreSensitivity(
  input: TemporalScoreInput,
  scenarios: readonly TemporalScoringSensitivityScenario[],
): readonly TemporalScoringSensitivityResult[] {
  const score = calculateTemporalScore(input);
  return Object.freeze(scenarios.map((scenario) => {
    const confidenceWeight = unit(scenario.confidenceWeight, 'SENSITIVITY_CONFIDENCE_WEIGHT');
    const dataQualityWeight = unit(scenario.dataQualityWeight, 'SENSITIVITY_DATA_QUALITY_WEIGHT');
    return Object.freeze({
      id: scenario.id,
      confidenceAdjustedScore: score.baseScore === null ? null : round(score.baseScore * confidenceWeight * dataQualityWeight),
    });
  }));
}

function validateStatistics(statistics: TemporalHypothesisStatistics): void {
  if (!Number.isInteger(statistics.sampleSize) || statistics.sampleSize <= 0) throw new Error('TSE_HYPOTHESIS_SAMPLE_SIZE_INVALID');
  unit(statistics.pValue, 'HYPOTHESIS_P_VALUE');
  unit(statistics.adjustedPValue, 'HYPOTHESIS_ADJUSTED_P_VALUE');
  if (!Number.isInteger(statistics.hypothesisCount) || statistics.hypothesisCount <= 0) throw new Error('TSE_HYPOTHESIS_COUNT_INVALID');
  if (!Number.isFinite(statistics.effectSize) || !Number.isFinite(statistics.confidenceInterval.lower) || !Number.isFinite(statistics.confidenceInterval.upper) || statistics.confidenceInterval.lower > statistics.confidenceInterval.upper) {
    throw new Error('TSE_HYPOTHESIS_STATISTICS_INVALID');
  }
  if (statistics.riskRatio !== null && (!Number.isFinite(statistics.riskRatio) || statistics.riskRatio < 0)) throw new Error('TSE_HYPOTHESIS_RISK_RATIO_INVALID');
}
