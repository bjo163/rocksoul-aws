import type { WorkflowDefinition, WorkflowRegistry } from './types.js';

type AnyWorkflowDefinition = WorkflowDefinition<unknown, unknown, unknown>;

export class InMemoryWorkflowRegistry implements WorkflowRegistry {
  private readonly definitions = new Map<string, AnyWorkflowDefinition>();

  register<Input, Output, Context>(definition: WorkflowDefinition<Input, Output, Context>): void {
    if (this.definitions.has(definition.id)) {
      throw new Error(`WORKFLOW_DUPLICATE_REGISTRATION: ${definition.id}`);
    }
    this.definitions.set(definition.id, definition as AnyWorkflowDefinition);
  }

  get<Input, Output, Context>(id: string): WorkflowDefinition<Input, Output, Context> | undefined {
    return this.definitions.get(id) as WorkflowDefinition<Input, Output, Context> | undefined;
  }

  has(id: string): boolean {
    return this.definitions.has(id);
  }

  list(): string[] {
    return Array.from(this.definitions.keys());
  }
}

export const globalWorkflowRegistry = new InMemoryWorkflowRegistry();

export function registerWorkflow<Input, Output, Context>(
  definition: WorkflowDefinition<Input, Output, Context>
): void {
  globalWorkflowRegistry.register(definition);
}

export function getWorkflow<Input, Output, Context>(
  id: string
): WorkflowDefinition<Input, Output, Context> | undefined {
  return globalWorkflowRegistry.get(id);
}

export function hasWorkflow(id: string): boolean {
  return globalWorkflowRegistry.has(id);
}

export function listWorkflows(): string[] {
  return globalWorkflowRegistry.list();
}