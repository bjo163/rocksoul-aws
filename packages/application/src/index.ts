import {
  runAnalysisWorkflow, runObservationWorkflow, runEvaluationWorkflow, runEvidenceWorkflow,
  runCreateReviewWorkflow, runTransitionReviewWorkflow,
  type AnalysisWorkflowPorts, type ObservationWorkflowPorts, type EvaluationWorkflowPorts,
  type EvidenceWorkflowPorts, type ReviewWorkflowPorts,
  type EvidenceWorkflowInput, type EvidenceWorkflowResult,
} from '@moonwitness/orchestrator';

export interface ApplicationServices {
  observe(input: Parameters<typeof runObservationWorkflow>[0]): ReturnType<typeof runObservationWorkflow>;
  analyze(input: Parameters<typeof runAnalysisWorkflow>[0]): ReturnType<typeof runAnalysisWorkflow>;
  evaluate(input: Parameters<typeof runEvaluationWorkflow>[0]): ReturnType<typeof runEvaluationWorkflow>;
  evidence(input: EvidenceWorkflowInput): Promise<EvidenceWorkflowResult>;
  createReview(input: Parameters<typeof runCreateReviewWorkflow>[0]): ReturnType<typeof runCreateReviewWorkflow>;
  transitionReview(input: Parameters<typeof runTransitionReviewWorkflow>[0]): ReturnType<typeof runTransitionReviewWorkflow>;
}

export interface ApplicationServiceOptions {
  analysis: AnalysisWorkflowPorts;
  observation: (actorId: string) => ObservationWorkflowPorts;
  evaluation: (actorId: string) => EvaluationWorkflowPorts;
  evidence: (actorId: string) => EvidenceWorkflowPorts;
  review: (actorId: string) => Pick<ReviewWorkflowPorts, 'createReview' | 'transitionReview' | 'saveEntity' | 'appendEvent'>;
}

export function createApplicationServices(options: ApplicationServiceOptions): ApplicationServices {
  return {
    observe: (input) => runObservationWorkflow(input, options.observation(input.actorId)),
    analyze: (input) => runAnalysisWorkflow(input, options.analysis),
    evaluate: (input) => runEvaluationWorkflow(input, options.evaluation(input.actorId)),
    evidence: (input) => runEvidenceWorkflow(input, options.evidence(input.actorId)),
    createReview: (input) => runCreateReviewWorkflow(input, options.review(input.actorId)),
    transitionReview: (input) => runTransitionReviewWorkflow(input, options.review(input.transition.actorId)),
  };
}
