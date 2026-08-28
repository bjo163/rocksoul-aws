/**
 * Host-neutral durable workflow for analysis jobs.
 *
 * Queue implementations and storage remain outside this package. The workflow
 * only coordinates their ports, which lets an API, worker, or another host
 * execute the same analysis contract.
 */

import { toEvidenceObservations, type WorkflowEvidence, type WorkflowRecord } from './index.js';

export interface AiAnalyzeWorkflowInput {
  caseId: string;
  actorId: string;
  text: string;
  options?: WorkflowRecord;
  semanticObservation?: WorkflowRecord;
  modelVersion: string;
  source: string;
}

export interface AiAnalyzeWorkflowPorts {
  listEvidence(caseId: string): Promise<WorkflowEvidence[]>;
  analyze(input: { text: string; options: WorkflowRecord; semanticObservation?: WorkflowRecord }): Promise<WorkflowRecord>;
  composeReminder?(seed?: number): Promise<unknown>;
  saveCase(input: { aggregate: WorkflowRecord; eventType: 'CASE.ANALYZED'; actorId: string }): Promise<unknown>;
  commitWitness(input: {
    recordId: string;
    recordType: 'AI_ANALYSIS';
    actorId: string;
    text: string;
    mizan: unknown;
    semantic: unknown;
    lifecycle: WorkflowRecord;
    reviewGate: unknown;
    modelVersion: string;
    source: string;
  }): Promise<{ node: { nodeId: string; hash: string }; root: string | null; checkpointId?: string | null }>;
  now?(): Date;
}

export interface AiAnalyzeWorkflowResult {
  caseId: string;
  analysis: WorkflowRecord;
  witness: { nodeId: string; hash: string; root: string | null; checkpointId: string | null };
}

export async function runAiAnalyzeWorkflow(
  input: AiAnalyzeWorkflowInput,
  ports: AiAnalyzeWorkflowPorts,
): Promise<AiAnalyzeWorkflowResult> {
  const options: WorkflowRecord = { ...(input.options ?? {}) };
  const evidence = await ports.listEvidence(input.caseId);
  options.persistedEvidence = toEvidenceObservations(evidence);
  if (input.semanticObservation) options.semanticObservation = input.semanticObservation;

  const analysis = await ports.analyze({
    text: input.text,
    options,
    semanticObservation: input.semanticObservation,
  });
  const includeReminder = options.includeReminder === true;
  const finalAnalysis = includeReminder
    ? { ...analysis, reminderBundle: await ports.composeReminder?.(typeof options.reminderSeed === 'number' ? options.reminderSeed : undefined) ?? null }
    : analysis;
  const aggregate: WorkflowRecord = {
    id: input.caseId,
    type: 'CASE',
    version: 1,
    status: 'ANALYZED',
    observation: { text: input.text },
    analysis: finalAnalysis,
    lifecycle: {
      caseLifecycle: finalAnalysis.lifecycle ?? null,
      moralLifecycle: finalAnalysis.moralLifecycle ?? null,
    },
    updatedAt: (ports.now?.() ?? new Date()).toISOString(),
  };

  await ports.saveCase({ aggregate, eventType: 'CASE.ANALYZED', actorId: input.actorId });
  const committed = await ports.commitWitness({
    recordId: `${input.caseId}:v1`,
    recordType: 'AI_ANALYSIS',
    actorId: input.actorId,
    text: input.text,
    mizan: finalAnalysis.mizan ?? null,
    semantic: finalAnalysis.semanticVector ?? finalAnalysis.semantic ?? null,
    lifecycle: aggregate.lifecycle as WorkflowRecord,
    reviewGate: finalAnalysis.reviewGate ?? null,
    modelVersion: input.modelVersion,
    source: input.source,
  });
  if (!committed.root) {
    const failure = new Error('WITNESS_ROOT_MISSING');
    Object.assign(failure, { code: 'WITNESS_ROOT_MISSING' });
    throw failure;
  }

  return {
    caseId: input.caseId,
    analysis: finalAnalysis,
    witness: {
      nodeId: committed.node.nodeId,
      hash: committed.node.hash,
      root: committed.root,
      checkpointId: committed.checkpointId ?? null,
    },
  };
}
