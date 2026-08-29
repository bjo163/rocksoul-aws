import type { WorkflowDefinition } from '@moonwitness/workflow';
import type {
  AnalysisWorkflowInput,
  AnalysisWorkflowPorts,
  AnalysisWorkflowResult,
  ObservationWorkflowInput,
  ObservationWorkflowPorts,
  ObservationWorkflowResult,
  EvaluationWorkflowInput,
  EvaluationWorkflowPorts,
  EvaluationWorkflowResult,
  EvidenceWorkflowInput,
  EvidenceWorkflowPorts,
  EvidenceWorkflowResult,
  ReviewWorkflowPorts,
  CreateReviewWorkflowInput,
  TransitionReviewWorkflowInput,
  ReviewRecord,
  AiAnalyzeWorkflowInput,
  AiAnalyzeWorkflowPorts,
  AiAnalyzeWorkflowResult,
  IngressWorkflowPorts,
  CreateIngressScheduleInput,
} from '@moonwitness/orchestrator';
import {
  runAnalysisWorkflow,
  runObservationWorkflow,
  runEvaluationWorkflow,
  runEvidenceWorkflow,
  runCreateReviewWorkflow,
  runTransitionReviewWorkflow,
  runAiAnalyzeWorkflow,
  runScheduleIngressWorkflow,
  runTriggerIngressWorkflow,
} from '@moonwitness/orchestrator';

export interface OrchestratorPorts {
  analysis: AnalysisWorkflowPorts;
  observation: ObservationWorkflowPorts;
  evaluation: EvaluationWorkflowPorts;
  evidence: EvidenceWorkflowPorts;
  review: ReviewWorkflowPorts;
  aiAnalysis: AiAnalyzeWorkflowPorts;
  ingress: IngressWorkflowPorts;
}

export const analysisWorkflowDefinition: WorkflowDefinition<AnalysisWorkflowInput, AnalysisWorkflowResult, AnalysisWorkflowPorts> = {
  id: 'case-analysis',
  version: '1.0.0',
  execute: (input, ports) => runAnalysisWorkflow(input, ports),
};

export const observationWorkflowDefinition: WorkflowDefinition<ObservationWorkflowInput, ObservationWorkflowResult, ObservationWorkflowPorts> = {
  id: 'case-observation',
  version: '1.0.0',
  execute: (input, ports) => runObservationWorkflow(input, ports),
};

export const evaluationWorkflowDefinition: WorkflowDefinition<EvaluationWorkflowInput, EvaluationWorkflowResult, EvaluationWorkflowPorts> = {
  id: 'case-evaluation',
  version: '1.0.0',
  execute: (input, ports) => runEvaluationWorkflow(input, ports),
};

export const evidenceWorkflowDefinition: WorkflowDefinition<EvidenceWorkflowInput, EvidenceWorkflowResult, EvidenceWorkflowPorts> = {
  id: 'evidence-attachment',
  version: '1.0.0',
  execute: (input, ports) => runEvidenceWorkflow(input, ports),
};

export const createReviewWorkflowDefinition: WorkflowDefinition<CreateReviewWorkflowInput, ReviewRecord, Pick<ReviewWorkflowPorts, 'createReview' | 'saveEntity' | 'appendEvent'>> = {
  id: 'review-create',
  version: '1.0.0',
  execute: (input, ports) => runCreateReviewWorkflow(input, ports),
};

export const transitionReviewWorkflowDefinition: WorkflowDefinition<TransitionReviewWorkflowInput, ReviewRecord, Pick<ReviewWorkflowPorts, 'transitionReview' | 'saveEntity' | 'appendEvent'>> = {
  id: 'review-transition',
  version: '1.0.0',
  execute: (input, ports) => runTransitionReviewWorkflow(input, ports),
};

export const aiAnalysisWorkflowDefinition: WorkflowDefinition<AiAnalyzeWorkflowInput, AiAnalyzeWorkflowResult, AiAnalyzeWorkflowPorts> = {
  id: 'ai-analysis',
  version: '1.0.0',
  execute: (input, ports) => runAiAnalyzeWorkflow(input, ports),
};

export const scheduleIngressWorkflowDefinition: WorkflowDefinition<CreateIngressScheduleInput, { schedule: Awaited<ReturnType<typeof runScheduleIngressWorkflow>>['schedule']; idempotent: boolean }, Pick<IngressWorkflowPorts, 'loadSchedule' | 'createSchedule'>> = {
  id: 'ingress-schedule',
  version: '1.0.0',
  execute: (input, ports) => runScheduleIngressWorkflow(input, ports),
};

export const triggerIngressWorkflowDefinition: WorkflowDefinition<{ ingressId: string; actorId: string; now?: string }, { schedule: Awaited<ReturnType<typeof runTriggerIngressWorkflow>>['schedule']; idempotent: boolean }, Pick<IngressWorkflowPorts, 'loadSchedule' | 'transitionSchedule'>> = {
  id: 'ingress-trigger',
  version: '1.0.0',
  execute: (input, ports) => runTriggerIngressWorkflow(input, ports),
};

let orchestratorWorkflowsRegistered = false;

export async function registerOrchestratorWorkflows(): Promise<void> {
  if (orchestratorWorkflowsRegistered) return;
  
  const { registerWorkflow, hasWorkflow } = await import('@moonwitness/workflow');
  
  if (hasWorkflow('case-analysis')) {
    orchestratorWorkflowsRegistered = true;
    return;
  }
  
  registerWorkflow(analysisWorkflowDefinition);
  registerWorkflow(observationWorkflowDefinition);
  registerWorkflow(evaluationWorkflowDefinition);
  registerWorkflow(evidenceWorkflowDefinition);
  registerWorkflow(createReviewWorkflowDefinition);
  registerWorkflow(transitionReviewWorkflowDefinition);
  registerWorkflow(aiAnalysisWorkflowDefinition);
  registerWorkflow(scheduleIngressWorkflowDefinition);
  registerWorkflow(triggerIngressWorkflowDefinition);
  
  orchestratorWorkflowsRegistered = true;
}

export const ORCHESTRATOR_WORKFLOW_IDS = [
  'case-analysis',
  'case-observation',
  'case-evaluation',
  'evidence-attachment',
  'review-create',
  'review-transition',
  'ai-analysis',
  'ingress-schedule',
  'ingress-trigger',
] as const;

export type OrchestratorWorkflowId = typeof ORCHESTRATOR_WORKFLOW_IDS[number];