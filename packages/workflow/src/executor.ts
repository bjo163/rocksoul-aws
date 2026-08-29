import type { WorkflowDefinition, WorkflowExecutionContext, WorkflowExecutionResult, WorkflowExecutor, WorkflowRegistry } from './types.js';
import { globalWorkflowRegistry } from './registry.js';

export class DefaultWorkflowExecutor implements WorkflowExecutor {
  constructor(private readonly registry: WorkflowRegistry = globalWorkflowRegistry) {}
  async execute<Input, Output, Context>(
    workflowId: string,
    input: Input,
    context: Context
  ): Promise<WorkflowExecutionResult<Output>> {
    const definition = this.registry.get<Input, Output, Context>(workflowId);
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
      if (!definition.execute) throw new Error(`WORKFLOW_EXECUTOR_UNSUPPORTED_STEPS: ${workflowId}`);
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

export function createWorkflowExecutor(registry: WorkflowRegistry = globalWorkflowRegistry): WorkflowExecutor {
  return new DefaultWorkflowExecutor(registry);
}

export async function executeWorkflow<Input, Output, Context>(
  workflowId: string,
  input: Input,
  context: Context
): Promise<WorkflowExecutionResult<Output>> {
  return globalWorkflowExecutor.execute(workflowId, input, context);
}
