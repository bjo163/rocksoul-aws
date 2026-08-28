export type EvidenceStatus =
  | 'OBSERVED'
  | 'SUPPORTED'
  | 'VERIFIED'
  | 'CORROBORATED'
  | 'INFERRED'
  | 'UNKNOWN'
  | 'CONFLICTED';

export type EvidenceRecord = {
  evidenceId: string;
  entityId: string;
  sourceType: string;
  reference?: string;
  status?: EvidenceStatus;
  confidence?: number;
  payload: Record<string, unknown>;
};

export interface EvidenceWorkflowInput {
  entityId: string;
  actorId: string;
  evidenceId: string;
  sourceType?: string;
  reference?: string;
  status?: string;
  confidence?: number;
  payload?: Record<string, unknown>;
  supersedes?: string;
  supersessionReason?: string;
  submittedThrough?: string;
}

export interface EvidenceWorkflowPorts {
  listEvidence(entityId: string): Promise<Array<{ evidenceId: string; payload?: Record<string, unknown> }>>;
  saveEvidence(record: EvidenceRecord): Promise<EvidenceRecord>;
}

export interface EvidenceWorkflowResult {
  id: string;
  status: 'EVIDENCE_RECORDED';
  evidence: EvidenceRecord;
  reanalysisRequired: true;
}

export class EvidenceWorkflowError extends Error {
  readonly code: string;

  constructor(code: string, message?: string) {
    super(message ?? code);
    this.code = code;
    this.name = 'EvidenceWorkflowError';
  }
}

const ALLOWED_STATUSES = new Set<EvidenceStatus>([
  'OBSERVED', 'SUPPORTED', 'VERIFIED', 'CORROBORATED', 'INFERRED', 'UNKNOWN', 'CONFLICTED',
]);

/**
 * Records immutable evidence and validates supersession before persistence.
 * Authorization (who may submit non-observed evidence) belongs to the host
 * adapter; this workflow owns the invariant and persistence ordering.
 */
export async function runEvidenceWorkflow(
  input: EvidenceWorkflowInput,
  ports: EvidenceWorkflowPorts,
): Promise<EvidenceWorkflowResult> {
  const status = (input.status ?? 'UNKNOWN').toUpperCase();
  if (!ALLOWED_STATUSES.has(status as EvidenceStatus)) {
    throw new EvidenceWorkflowError('INVALID_EVIDENCE_STATUS');
  }

  const history = await ports.listEvidence(input.entityId);
  if (history.some((item) => item.evidenceId === input.evidenceId)) {
    throw new EvidenceWorkflowError('EVIDENCE_IMMUTABLE', 'Create a new evidenceId and use supersedes instead of updating an existing record.');
  }

  if (input.supersedes) {
    if (input.supersedes === input.evidenceId) {
      throw new EvidenceWorkflowError('EVIDENCE_SELF_SUPERSESSION');
    }
    if (!history.some((item) => item.evidenceId === input.supersedes)) {
      throw new EvidenceWorkflowError('SUPERSEDED_EVIDENCE_NOT_FOUND');
    }
    if (!input.supersessionReason?.trim()) {
      throw new EvidenceWorkflowError('SUPERSESSION_REASON_REQUIRED');
    }
    if (history.some((item) => item.payload?.supersedes === input.supersedes)) {
      throw new EvidenceWorkflowError('EVIDENCE_ALREADY_SUPERSEDED');
    }
  }

  const record: EvidenceRecord = {
    evidenceId: input.evidenceId,
    entityId: input.entityId,
    sourceType: input.sourceType || 'USER_SUBMITTED',
    ...(input.reference !== undefined ? { reference: input.reference } : {}),
    status: status as EvidenceStatus,
    ...(typeof input.confidence === 'number' ? { confidence: Math.max(0, Math.min(1, input.confidence)) } : {}),
    payload: {
      ...(input.payload ?? {}),
      ...(input.submittedThrough ? { submittedThrough: input.submittedThrough } : {}),
      ...(input.supersedes ? { supersedes: input.supersedes, supersessionReason: input.supersessionReason } : {}),
    },
  };
  const evidence = await ports.saveEvidence(record);
  return { id: input.entityId, status: 'EVIDENCE_RECORDED', evidence, reanalysisRequired: true };
}
