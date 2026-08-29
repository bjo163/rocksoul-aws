import type { WorkflowDefinition, WorkflowExecutionContext, WorkflowExecutionResult, WorkflowExecutor } from './types.js';
import { getWorkflow } from './registry.js';

export class DefaultWorkflowExecutor implements WorkflowExecutor {
  async execute<Input, Output, Context>(
    workflowId: string,
    input: Input,
    context: Context
  ): Promise<WorkflowExecutionResult<Output>> {
    const definition = getWorkflow<Input, Output, Context>(workflowId);
    if (!definition) {
      throw new Error(`WORKFLOW_NOT_FOUND: ${workflowId}`);
    }

    const startedAt = new Date();
    const executionContext: WorkflowExecutionContext = {
      workflowId,
      version: definition.version,
      startedAt,
      metadata: {},
    };

    try {
      const output = await definition.execute(input, context);
      const completedAt = new Date();
      return {
        workflowId,
        version: definition.version,
        status: 'COMPLETED',
        output,
        startedAt,
        completedAt,
        metadata: executionContext.metadata,
      };
    } catch (error) {
      const completedAt = new Date();
      return {
        workflowId,
        version: definition.version,
        status: 'FAILED',
        error: error instanceof Error ? error : new Error(String(error)),
        startedAt,
        completedAt,
        metadata: executionContext.metadata,
      };
    }
  }
}

export const globalWorkflowExecutor = new DefaultWorkflowExecutor();

export async function executeWorkflow<Input, Output, Context>(
  workflowId: string,
  input: Input,
  context: Context
): Promise<WorkflowExecutionResult<Output>> {
  return globalWorkflowExecutor.execute(workflowId, input, context);
}