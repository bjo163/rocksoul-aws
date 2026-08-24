/** Deterministic lifecycle state for evidence-driven re-analysis. */

export type ReanalysisState = 'CURRENT' | 'REANALYSIS_REQUIRED' | 'UNRESOLVED_INPUT';

export type ReanalysisEvidence = {
  evidenceId: string;
  version?: number;
  status?: string;
  reference?: string;
  confidence?: number;
  supersededBy?: string;
};

export type ReanalysisSnapshot = {
  caseId: string;
  analysisVersion: number;
  evidenceFingerprint: string | null;
  analysisEvidenceFingerprint: string | null;
  state: ReanalysisState;
  reason: 'MATCH' | 'EVIDENCE_CHANGED' | 'NO_ANALYSIS' | 'UNRESOLVED_EVIDENCE';
};

function stableValue(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return `[${value.map(stableValue).join(',')}]`;
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${stableValue(item)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export function fingerprintEvidence(evidence: ReanalysisEvidence[]): string {
  const normalized = [...evidence]
    .map((item) => ({
      evidenceId: item.evidenceId,
      version: item.version ?? 0,
      status: item.status ?? 'UNKNOWN',
      reference: item.reference ?? '',
      confidence: item.confidence ?? null,
      supersededBy: item.supersededBy ?? null,
    }))
    .sort((a, b) => a.evidenceId.localeCompare(b.evidenceId) || a.version - b.version);
  return stableValue(normalized);
}

export function resolveReanalysisState(input: {
  caseId: string;
  analysisVersion?: number | null;
  currentEvidence: ReanalysisEvidence[];
  analyzedEvidenceFingerprint?: string | null;
}): ReanalysisSnapshot {
  const unresolvedEvidence = input.currentEvidence.some((item) => !item.evidenceId || item.supersededBy === '__UNRESOLVED__');
  const evidenceFingerprint = fingerprintEvidence(input.currentEvidence);
  const analysisVersion = Number(input.analysisVersion ?? 0);

  if (unresolvedEvidence) {
    return {
      caseId: input.caseId,
      analysisVersion,
      evidenceFingerprint,
      analysisEvidenceFingerprint: input.analyzedEvidenceFingerprint ?? null,
      state: 'UNRESOLVED_INPUT',
      reason: 'UNRESOLVED_EVIDENCE',
    };
  }

  if (!input.analyzedEvidenceFingerprint) {
    return {
      caseId: input.caseId,
      analysisVersion,
      evidenceFingerprint,
      analysisEvidenceFingerprint: null,
      state: 'REANALYSIS_REQUIRED',
      reason: 'NO_ANALYSIS',
    };
  }

  const current = evidenceFingerprint === input.analyzedEvidenceFingerprint;
  return {
    caseId: input.caseId,
    analysisVersion,
    evidenceFingerprint,
    analysisEvidenceFingerprint: input.analyzedEvidenceFingerprint,
    state: current ? 'CURRENT' : 'REANALYSIS_REQUIRED',
    reason: current ? 'MATCH' : 'EVIDENCE_CHANGED',
  };
}
