import type { WorkflowDefinition } from './types.js';

export function defineWorkflow<Input, Output, Context>(
  definition: WorkflowDefinition<Input, Output, Context>,
): WorkflowDefinition<Input, Output, Context> {
  if (!definition.id.trim()) throw new Error('WORKFLOW_DEFINITION_MISSING_ID');
  if (!definition.version.trim()) throw new Error('WORKFLOW_DEFINITION_MISSING_VERSION');
  if (!definition.execute && !definition.steps?.length) throw new Error(`WORKFLOW_EXECUTOR_MISSING: ${definition.id}`);
  return Object.freeze({ ...definition });
}

export function composeWorkflows(...workflows: readonly WorkflowDefinition[]): WorkflowDefinition {
  if (!workflows.length) throw new Error('WORKFLOW_COMPOSITION_EMPTY');
  return defineWorkflow({
    id: workflows.map((workflow) => workflow.id).join('+'),
    version: workflows.map((workflow) => workflow.version).join('+'),
    metadata: { composedFrom: workflows.map((workflow) => workflow.id), serializable: false },
    execute: async (input, context) => {
      let value = input;
      for (const workflow of workflows) {
        if (!workflow.execute) throw new Error(`WORKFLOW_EXECUTOR_UNSUPPORTED_STEPS: ${workflow.id}`);
        value = await workflow.execute(value, context);
      }
      return value;
    },
  });
}
