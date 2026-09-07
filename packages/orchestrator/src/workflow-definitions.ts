import type { WorkflowDefinition, WorkflowRegistry } from '@moonwitness/workflow';
import type {
  AnalysisWorkflowInput, AnalysisWorkflowPorts, AnalysisWorkflowResult,
  ObservationWorkflowInput, ObservationWorkflowPorts, ObservationWorkflowResult,
  EvaluationWorkflowInput, EvaluationWorkflowPorts, EvaluationWorkflowResult,
  EvidenceWorkflowInput, EvidenceWorkflowPorts, EvidenceWorkflowResult,
  ReviewWorkflowPorts, CreateReviewWorkflowInput, TransitionReviewWorkflowInput, ReviewRecord,
  AiAnalyzeWorkflowInput, AiAnalyzeWorkflowPorts, AiAnalyzeWorkflowResult,
  IngressWorkflowPorts, CreateIngressScheduleInput,
} from './index.js';
import {
  runAnalysisWorkflow, runObservationWorkflow, runEvaluationWorkflow, runEvidenceWorkflow,
  runCreateReviewWorkflow, runTransitionReviewWorkflow, runAiAnalyzeWorkflow,
  runScheduleIngressWorkflow, runTriggerIngressWorkflow,
} from './index.js';

export interface OrchestratorPorts {
  analysis: AnalysisWorkflowPorts;
  observation: ObservationWorkflowPorts;
  evaluation: EvaluationWorkflowPorts;
  evidence: EvidenceWorkflowPorts;
  review: ReviewWorkflowPorts;
  aiAnalysis: AiAnalyzeWorkflowPorts;
  ingress: IngressWorkflowPorts;
}

export const analysisWorkflowDefinition: WorkflowDefinition<AnalysisWorkflowInput, AnalysisWorkflowResult, AnalysisWorkflowPorts> = { id: 'case-analysis', version: '1.0.0', execute: runAnalysisWorkflow };
export const observationWorkflowDefinition: WorkflowDefinition<ObservationWorkflowInput, ObservationWorkflowResult, ObservationWorkflowPorts> = { id: 'case-observation', version: '1.0.0', execute: runObservationWorkflow };
export const evaluationWorkflowDefinition: WorkflowDefinition<EvaluationWorkflowInput, EvaluationWorkflowResult, EvaluationWorkflowPorts> = { id: 'case-evaluation', version: '1.0.0', execute: runEvaluationWorkflow };
export const evidenceWorkflowDefinition: WorkflowDefinition<EvidenceWorkflowInput, EvidenceWorkflowResult, EvidenceWorkflowPorts> = { id: 'evidence-attachment', version: '1.0.0', execute: runEvidenceWorkflow };
export const createReviewWorkflowDefinition: WorkflowDefinition<CreateReviewWorkflowInput, ReviewRecord, Pick<ReviewWorkflowPorts, 'createReview' | 'saveEntity' | 'appendEvent'>> = { id: 'review-create', version: '1.0.0', execute: runCreateReviewWorkflow };
export const transitionReviewWorkflowDefinition: WorkflowDefinition<TransitionReviewWorkflowInput, ReviewRecord, Pick<ReviewWorkflowPorts, 'transitionReview' | 'saveEntity' | 'appendEvent'>> = { id: 'review-transition', version: '1.0.0', execute: runTransitionReviewWorkflow };
export const aiAnalysisWorkflowDefinition: WorkflowDefinition<AiAnalyzeWorkflowInput, AiAnalyzeWorkflowResult, AiAnalyzeWorkflowPorts> = { id: 'ai-analysis', version: '1.0.0', execute: runAiAnalyzeWorkflow };
export const scheduleIngressWorkflowDefinition: WorkflowDefinition<CreateIngressScheduleInput, { schedule: Awaited<ReturnType<typeof runScheduleIngressWorkflow>>['schedule']; idempotent: boolean }, Pick<IngressWorkflowPorts, 'loadSchedule' | 'createSchedule'>> = { id: 'ingress-schedule', version: '1.0.0', execute: runScheduleIngressWorkflow };
export const triggerIngressWorkflowDefinition: WorkflowDefinition<{ ingressId: string; actorId: string; now?: string }, { schedule: Awaited<ReturnType<typeof runTriggerIngressWorkflow>>['schedule']; idempotent: boolean }, Pick<IngressWorkflowPorts, 'loadSchedule' | 'transitionSchedule'>> = { id: 'ingress-trigger', version: '1.0.0', execute: runTriggerIngressWorkflow };

export const ORCHESTRATOR_WORKFLOW_IDS = [
  'case-analysis', 'case-observation', 'case-evaluation', 'evidence-attachment',
  'review-create', 'review-transition', 'ai-analysis', 'ingress-schedule', 'ingress-trigger',
] as const;
export type OrchestratorWorkflowId = typeof ORCHESTRATOR_WORKFLOW_IDS[number];

export const orchestratorWorkflowDefinitions: readonly WorkflowDefinition[] = [
  analysisWorkflowDefinition, observationWorkflowDefinition, evaluationWorkflowDefinition,
  evidenceWorkflowDefinition, createReviewWorkflowDefinition, transitionReviewWorkflowDefinition,
  aiAnalysisWorkflowDefinition, scheduleIngressWorkflowDefinition, triggerIngressWorkflowDefinition,
].map((definition) => definition as unknown as WorkflowDefinition);

/** Explicitly installs business workflows into an application-owned registry. */
export function registerOrchestratorWorkflows(registry: WorkflowRegistry): void {
  for (const definition of orchestratorWorkflowDefinitions) {
    if (!registry.has(definition.id)) registry.register(definition);
  }
}
