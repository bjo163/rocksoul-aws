import type { WitnessReference } from '@moonwitness/contracts';

export type WorkflowRecord = Record<string, unknown>;

export interface WorkflowEvidence {
  evidenceId: string;
  sourceType?: string;
  reference?: string;
  status?: string;
  confidence?: number;
  payload?: WorkflowRecord;
}

export interface AnalysisWorkflowInput {
  caseId: string;
  actorId: string;
  text: string;
  options?: WorkflowRecord;
  semanticObservation?: WorkflowRecord;
  includeReminder?: boolean;
  reminderSeed?: number;
  modelVersion: string;
  source: string;
  ownerRid?: string | null;
}

export interface AnalysisWorkflowPorts {
  loadCase(caseId: string): Promise<{ version?: number } | null>;
  listEvidence(caseId: string): Promise<WorkflowEvidence[]>;
  analyze(input: { text: string; options: WorkflowRecord; semanticObservation?: WorkflowRecord }): Promise<WorkflowRecord>;
  composeReminder?(seed?: number): Promise<unknown>;
  saveCase(input: { aggregate: AnalysisCaseAggregate; eventType: string; actorId: string }): Promise<unknown>;
  commitWitness(input: {
    recordId: string;
    recordType: 'ANALYSIS';
    actorId: string;
    text: string;
    mizan: unknown;
    semantic: unknown;
    lifecycle: WorkflowRecord;
    reviewGate: unknown;
    modelVersion: string;
    source: string;
  }): Promise<{ node: { nodeId: string; hash: string }; root: string | null; checkpoint: { checkpoint: { checkpointId: string } } | null }>;
  now?(): Date;
}

export interface AnalysisWorkflowResult {
  caseId: string;
  aggregate: AnalysisCaseAggregate;
  analysis: WorkflowRecord;
  witness: WitnessReference;
}

export interface ObservationWorkflowInput {
  entityId: string;
  actorId: string;
  eventId: string;
  source: string;
  payload: WorkflowRecord;
  context: WorkflowRecord;
  ownerRid?: string | null;
}

export interface ObservationWorkflowPorts {
  loadEntity(entityId: string): Promise<{ version?: number; payload?: WorkflowRecord } | null>;
  batch(work: () => Promise<void>): Promise<void>;
  saveEntity(input: { id: string; type: 'CASE'; expectedVersion: number; version: number; payload: WorkflowRecord }): Promise<unknown>;
  appendEvent(input: { eventId: string; entityId: string; eventType: 'OBSERVATION'; payload: WorkflowRecord; actorId: string }): Promise<unknown>;
  now?(): Date;
}

export interface ObservationWorkflowResult {
  id: string;
  kind: 'OBSERVATION';
  status: 'RECORDED';
  entityId: string;
  version: number;
  event: unknown;
}

export interface AnalysisCaseAggregate {
  id: string;
  type: 'CASE';
  version: number;
  status: 'ANALYZED';
  observation: WorkflowRecord;
  analysis: WorkflowRecord;
  lifecycle: WorkflowRecord | null;
  updatedAt: string;
  ownerRid?: string;
}

function asRecord(value: unknown): WorkflowRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as WorkflowRecord : {};
}

function asNullableRecord(value: unknown): WorkflowRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as WorkflowRecord : null;
}

/**
 * Converts persisted evidence into the engine's evidence-observation shape.
 * The workflow deliberately forwards evidence status and provenance rather
 * than assigning authority to an engine result.
 */
export function toEvidenceObservations(evidence: WorkflowEvidence[]): WorkflowRecord[] {
  return evidence.map((item) => ({
    ...asRecord(item.payload),
    id: item.evidenceId,
    status: item.status ?? 'UNKNOWN',
    type: item.sourceType,
    reference: item.reference,
    confidence: item.confidence,
  }));
}

/**
 * Runs the durable analysis workflow. HTTP, authentication, storage, witness,
 * and reminder implementations are injected through ports so this package can
 * be hosted by Cosmic's reference API or another system such as Moonwitness.
 */
export async function runAnalysisWorkflow(input: AnalysisWorkflowInput, ports: AnalysisWorkflowPorts): Promise<AnalysisWorkflowResult> {
  const existing = await ports.loadCase(input.caseId);
  const persistedEvidence = await ports.listEvidence(input.caseId);
  const options: WorkflowRecord = {
    ...(input.options ?? {}),
    persistedEvidence: toEvidenceObservations(persistedEvidence),
  };
  if (input.semanticObservation) options.semanticObservation = input.semanticObservation;

  const analysis = await ports.analyze({ text: input.text, options, semanticObservation: input.semanticObservation });
  const finalAnalysis = input.includeReminder
    ? { ...analysis, reminderBundle: await ports.composeReminder?.(input.reminderSeed) ?? null }
    : analysis;
  const current = asRecord(existing);
  const version = Number(current.version ?? 0) + 1;
  const aggregate: AnalysisCaseAggregate = {
    id: input.caseId,
    type: 'CASE',
    version,
    status: 'ANALYZED',
    ...(input.ownerRid ? { ownerRid: input.ownerRid } : {}),
    observation: { text: input.text },
    analysis: finalAnalysis,
    lifecycle: asNullableRecord(finalAnalysis.lifecycle),
    updatedAt: (ports.now?.() ?? new Date()).toISOString(),
  };

  await ports.saveCase({ aggregate, eventType: 'CASE.ANALYZED', actorId: input.actorId });
  const committed = await ports.commitWitness({
    recordId: `${input.caseId}:v${version}`,
    recordType: 'ANALYSIS',
    actorId: input.actorId,
    text: input.text,
    mizan: finalAnalysis.mizan ?? null,
    semantic: finalAnalysis.semanticVector ?? finalAnalysis.semantic ?? null,
    lifecycle: {
      caseLifecycle: finalAnalysis.lifecycle ?? null,
      moralLifecycle: finalAnalysis.moralLifecycle ?? null,
    },
    reviewGate: finalAnalysis.reviewGate ?? null,
    modelVersion: input.modelVersion,
    source: input.source,
  });
  if (!committed.root) throw new Error('WITNESS_ROOT_MISSING');

  return {
    caseId: input.caseId,
    aggregate,
    analysis: finalAnalysis,
    witness: {
      nodeId: committed.node.nodeId,
      hash: committed.node.hash,
      root: committed.root,
      checkpointId: committed.checkpoint?.checkpoint.checkpointId ?? null,
    },
  };
}

/**
 * Records an observation as a versioned CASE and an immutable event. The host
 * supplies persistence primitives; the workflow owns the durable shape and
 * transaction boundary.
 */
export async function runObservationWorkflow(input: ObservationWorkflowInput, ports: ObservationWorkflowPorts): Promise<ObservationWorkflowResult> {
  const previous = await ports.loadEntity(input.entityId);
  const version = Number(previous?.version ?? 0) + 1;
  const previousPayload = asRecord(previous?.payload);
  const updatedAt = (ports.now?.() ?? new Date()).toISOString();
  const casePayload: WorkflowRecord = {
    ...previousPayload,
    id: input.entityId,
    type: 'CASE',
    version,
    status: 'OBSERVED',
    ...(input.ownerRid ? { ownerRid: input.ownerRid } : {}),
    observation: { source: input.source, payload: input.payload },
    updatedAt,
  };
  const eventPayload = { observation: input.payload, context: input.context, source: input.source };

  await ports.batch(async () => {
    await ports.saveEntity({ id: input.entityId, type: 'CASE', expectedVersion: Number(previous?.version ?? 0), version, payload: casePayload });
    await ports.appendEvent({ eventId: input.eventId, entityId: input.entityId, eventType: 'OBSERVATION', payload: eventPayload, actorId: input.actorId });
  });

  return { id: input.eventId, kind: 'OBSERVATION', status: 'RECORDED', entityId: input.entityId, version, event: { eventId: input.eventId, entityId: input.entityId, eventType: 'OBSERVATION', payload: eventPayload, actorId: input.actorId, recordedAt: updatedAt } };
}
