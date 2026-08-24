export type EvidenceClass =
  | 'QURAN_EXPLICIT'
  | 'TEXTUAL_WITNESS_CORROBORATION'
  | 'HISTORICAL_REPORT'
  | 'RESEARCH_DATASET'
  | 'OBSERVED'
  | 'INFERRED'
  | 'ENGINE_DERIVED'
  | 'AI_INFERENCE'
  | 'UNKNOWN'
  | 'CONFLICTED';

export type EvidenceGrounding = 'EXPLICIT' | 'CORROBORATIVE' | 'OBSERVED' | 'DERIVED' | 'UNKNOWN' | 'CONFLICTED';

export type CanonicalEvidenceProvenance = {
  evidenceId: string;
  entityId: string;
  sourceType: string;
  reference?: string;
  status: 'OBSERVED' | 'SUPPORTED' | 'VERIFIED' | 'CORROBORATED' | 'INFERRED' | 'UNKNOWN' | 'CONFLICTED';
  confidence?: number;
  class: EvidenceClass;
  grounding: EvidenceGrounding;
  normativeAuthority: boolean;
  originalRevelationEquated: boolean;
  provenance: 'CANONICAL_RECORD' | 'RUNTIME_OBSERVATION' | 'DERIVED_ENGINE' | 'UNKNOWN';
  superseded: boolean;
};

type RawEvidence = {
  evidenceId: string;
  entityId: string;
  sourceType?: unknown;
  reference?: unknown;
  status?: unknown;
  confidence?: unknown;
  supersededBy?: unknown;
  payload?: Record<string, unknown>;
};

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function confidence(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  return Math.min(1, Math.max(0, value));
}

function status(value: unknown): CanonicalEvidenceProvenance['status'] {
  const allowed = new Set<CanonicalEvidenceProvenance['status']>([
    'OBSERVED', 'SUPPORTED', 'VERIFIED', 'CORROBORATED', 'INFERRED', 'UNKNOWN', 'CONFLICTED',
  ]);
  return allowed.has(value as CanonicalEvidenceProvenance['status']) ? value as CanonicalEvidenceProvenance['status'] : 'UNKNOWN';
}

function classify(sourceType: string, evidenceStatus: CanonicalEvidenceProvenance['status'], payload: Record<string, unknown> | undefined): EvidenceClass {
  const explicitClass = text(payload?.evidenceClass) as EvidenceClass | undefined;
  if (explicitClass) return explicitClass;
  if (sourceType === 'DOCUMENT' && evidenceStatus === 'VERIFIED') return 'HISTORICAL_REPORT';
  if (sourceType === 'TESTIMONY') return 'TEXTUAL_WITNESS_CORROBORATION';
  if (sourceType === 'SYSTEM_RECORD' || sourceType === 'PHOTO_VIDEO' || sourceType === 'USER_SUBMITTED') return evidenceStatus === 'OBSERVED' ? 'OBSERVED' : 'UNKNOWN';
  return 'UNKNOWN';
}

function groundingFor(classification: EvidenceClass, evidenceStatus: CanonicalEvidenceProvenance['status']): EvidenceGrounding {
  if (classification === 'QURAN_EXPLICIT') return 'EXPLICIT';
  if (classification === 'TEXTUAL_WITNESS_CORROBORATION') return 'CORROBORATIVE';
  if (classification === 'OBSERVED' || evidenceStatus === 'OBSERVED') return 'OBSERVED';
  if (classification === 'INFERRED' || classification === 'ENGINE_DERIVED' || classification === 'AI_INFERENCE' || evidenceStatus === 'INFERRED') return 'DERIVED';
  if (classification === 'CONFLICTED' || evidenceStatus === 'CONFLICTED') return 'CONFLICTED';
  return 'UNKNOWN';
}

export function normalizeEvidenceProvenance(records: RawEvidence[]): CanonicalEvidenceProvenance[] {
  return records.map((record) => {
    const sourceType = text(record.sourceType) ?? 'UNKNOWN';
    const evidenceStatus = status(record.status);
    const classification = classify(sourceType, evidenceStatus, record.payload);
    const grounding = groundingFor(classification, evidenceStatus);
    return {
      evidenceId: record.evidenceId,
      entityId: record.entityId,
      sourceType,
      ...(text(record.reference) ? { reference: text(record.reference) } : {}),
      status: evidenceStatus,
      ...(confidence(record.confidence) !== undefined ? { confidence: confidence(record.confidence) } : {}),
      class: classification,
      grounding,
      normativeAuthority: classification === 'QURAN_EXPLICIT',
      originalRevelationEquated: false,
      provenance: classification === 'QURAN_EXPLICIT' || classification === 'HISTORICAL_REPORT' || classification === 'TEXTUAL_WITNESS_CORROBORATION'
        ? 'CANONICAL_RECORD'
        : classification === 'OBSERVED'
          ? 'RUNTIME_OBSERVATION'
          : classification === 'ENGINE_DERIVED' || classification === 'AI_INFERENCE'
            ? 'DERIVED_ENGINE'
            : 'UNKNOWN',
      superseded: Boolean(text(record.supersededBy)),
    };
  });
}
