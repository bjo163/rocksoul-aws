export interface WorkflowStep<Input = unknown, Context = unknown, Output = unknown> {
  id: string;
  execute: (input: Input, context: Context) => Promise<Output>;
  timeoutMs?: number;
  retry?: RetryPolicy;
  dependsOn?: readonly string[];
}

export interface RetryPolicy {
  maxAttempts: number;
  backoffMs?: number;
  shouldRetry?: (error: unknown, attempt: number) => boolean;
}

export interface WorkflowDefinition<Input = unknown, Output = unknown, Context = unknown> {
  id: string;
  version: string;
  execute?: (input: Input, context: Context) => Promise<Output>;
  steps?: readonly WorkflowStep<unknown, Context, unknown>[];
  metadata?: WorkflowMetadata;
}

export interface WorkflowMetadata {
  name?: string;
  description?: string;
  serializable?: boolean;
  dependencies?: readonly string[];
  [key: string]: unknown;
}

export interface WorkflowExecutionContext {
  workflowId: string;
  version: string;
  startedAt: Date;
  metadata: Record<string, unknown>;
}

export interface WorkflowExecutionResult<Output = unknown> {
  workflowId: string;
  version: string;
  status: 'COMPLETED' | 'FAILED';
  output?: Output;
  error?: Error;
  startedAt: Date;
  completedAt: Date;
  metadata: Record<string, unknown>;
}

export interface WorkflowRegistry {
  register<Input, Output, Context>(definition: WorkflowDefinition<Input, Output, Context>): void;
  get<Input, Output, Context>(id: string): WorkflowDefinition<Input, Output, Context> | undefined;
  has(id: string): boolean;
  list(): string[];
}

export interface WorkflowExecutor {
  execute<Input, Output, Context>(
    workflowId: string,
    input: Input,
    context: Context
  ): Promise<WorkflowExecutionResult<Output>>;
}

export interface WorkflowContext<Services = Record<string, unknown>> {
  readonly services?: Services;
  readonly signal?: AbortSignal;
  readonly metadata?: Record<string, unknown>;
}

export type WorkflowResult<Output = unknown> = WorkflowExecutionResult<Output>;
