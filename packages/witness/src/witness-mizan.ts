import { sha256, type DagNode, type WitnessDag } from './witness-dag.js';

export interface MizanWitnessInput {
  recordId: string;
  recordType: 'ANALYSIS' | 'EVALUATION' | 'AI_ANALYSIS';
  actorId?: string | null;
  occurredAt?: string;
  text?: string;
  mizan?: unknown;
  semantic?: unknown;
  lifecycle?: unknown;
  reviewGate?: unknown;
  modelVersion?: string;
  source?: string;
}

export interface MizanWitnessPayload extends Record<string, unknown> {
  schema: 'MW-MIZAN-WITNESS-V2';
  recordId: string;
  recordType: MizanWitnessInput['recordType'];
  source: string;
  inputHash: string;
  mizanHash: string;
  semanticHash: string;
  lifecycleHash: string;
  reviewGateHash: string;
  resultHash: string;
  modelVersion: string;
  privacy: 'HASH_COMMITMENT_ONLY';
}

/**
 * Commit a Mizan result into Q-DAG without storing the raw input text or full
 * analysis payload. The DAG keeps deterministic commitments suitable for
 * audit/proof while the primary application store retains the readable data.
 */
export function appendMizanWitness(dag: WitnessDag, input: MizanWitnessInput): DagNode<MizanWitnessPayload> {
  if (!input.recordId) throw new Error('MIZAN_WITNESS_RECORD_ID_REQUIRED');
  const payload: MizanWitnessPayload = {
    schema: 'MW-MIZAN-WITNESS-V2',
    recordId: input.recordId,
    recordType: input.recordType,
    source: input.source ?? 'moonwitness-api',
    inputHash: sha256({ text: input.text ?? '' }),
    mizanHash: sha256(input.mizan ?? null),
    semanticHash: sha256(input.semantic ?? null),
    lifecycleHash: sha256(input.lifecycle ?? null),
    reviewGateHash: sha256(input.reviewGate ?? null),
    resultHash: sha256({
      recordId: input.recordId,
      recordType: input.recordType,
      mizan: input.mizan ?? null,
      semantic: input.semantic ?? null,
      lifecycle: input.lifecycle ?? null,
      reviewGate: input.reviewGate ?? null,
      modelVersion: input.modelVersion ?? 'unknown',
    }),
    modelVersion: input.modelVersion ?? 'unknown',
    privacy: 'HASH_COMMITMENT_ONLY',
  };
  return dag.append({
    nodeId: `MIZAN_${input.recordType}_${input.recordId}`,
    kind: `MIZAN.${input.recordType}`,
    payload,
    actorId: input.actorId ?? null,
    occurredAt: input.occurredAt,
  });
}
