import { buildAnalyticalSemanticVector } from '@moonwitness/semantic-engine';
import { calculateTemporalState, type TSEInput } from '@moonwitness/tse-engine';
import { evaluateMizan, evaluateQuranicMizan } from '@moonwitness/mizan-engine';
import { explainLegalResult, explainTemporalContext } from '@moonwitness/explanation-engine';
import { createWorkflowExecutor, InMemoryWorkflowRegistry, type WorkflowDefinition, type WorkflowExecutionResult, type WorkflowRegistry } from '@moonwitness/workflow';

export interface EngineContext {
  readonly clock: { now(): Date };
  readonly logger: { debug?(message: string, details?: unknown): void; info?(message: string, details?: unknown): void; error?(message: string, details?: unknown): void };
  readonly capabilities: CapabilityRegistry;
  readonly workflows: WorkflowRegistry;
  readonly metadata: Record<string, unknown>;
}

export interface EngineCapability {
  readonly id: string;
  readonly version: string;
  readonly capabilities: readonly string[];
  initialize?(context: EngineContext): Promise<void>;
  dispose?(): Promise<void>;
}

export interface CapabilityRegistry {
  register(capability: EngineCapability): void;
  get(id: string): EngineCapability | undefined;
  list(): readonly EngineCapability[];
}

class InMemoryCapabilityRegistry implements CapabilityRegistry {
  private readonly values = new Map<string, EngineCapability>();
  register(capability: EngineCapability): void {
    if (this.values.has(capability.id)) throw new Error(`CAPABILITY_DUPLICATE_REGISTRATION: ${capability.id}`);
    this.values.set(capability.id, capability);
  }
  get(id: string): EngineCapability | undefined { return this.values.get(id); }
  list(): readonly EngineCapability[] { return [...this.values.values()]; }
}

export interface EngineBundle {
  readonly id: string;
  readonly version: string;
  readonly capabilities: readonly EngineCapability[];
  readonly workflows: readonly WorkflowDefinition[];
  readonly metadata?: Record<string, unknown>;
}

export function defineBundle(bundle: EngineBundle): EngineBundle {
  if (!bundle.id || !bundle.version) throw new Error('ENGINE_BUNDLE_ID_AND_VERSION_REQUIRED');
  return Object.freeze({ ...bundle, capabilities: [...bundle.capabilities], workflows: [...bundle.workflows] });
}
export const createBundle = defineBundle;
export function mergeBundles(id: string, ...bundles: readonly EngineBundle[]): EngineBundle {
  return defineBundle({
    id,
    version: bundles.map((bundle) => bundle.version).join('+'),
    capabilities: bundles.flatMap((bundle) => bundle.capabilities),
    workflows: bundles.flatMap((bundle) => bundle.workflows),
    metadata: { composedFrom: bundles.map((bundle) => bundle.id) },
  });
}

export interface AnalyzeOptions { semanticObservation?: Record<string, unknown>; temporalInput?: TSEInput; [key: string]: unknown }
export interface QueryOptions { [key: string]: unknown }
export interface EvaluateOptions { [key: string]: unknown }
export interface ExplainOptions { [key: string]: unknown }

export interface IntelligenceEngine {
  readonly context: EngineContext;
  analyze<TInput, TResult = Record<string, unknown>>(input: TInput, options?: AnalyzeOptions): Promise<TResult>;
  query<TInput, TResult = Record<string, unknown>>(input: TInput, options?: QueryOptions): Promise<TResult>;
  evaluate<TInput, TResult = Record<string, unknown>>(input: TInput, options?: EvaluateOptions): Promise<TResult>;
  explain<TInput, TResult = Record<string, unknown>>(input: TInput, options?: ExplainOptions): Promise<TResult>;
  execute<TInput, TResult, TContext>(workflow: WorkflowDefinition<TInput, TResult, TContext>, input: TInput, context: TContext): Promise<WorkflowExecutionResult<TResult>>;
  use(capability: EngineCapability): this;
  useBundle(bundle: EngineBundle): this;
}

export interface IntelligenceEngineOptions {
  capabilities?: readonly EngineCapability[];
  workflows?: readonly WorkflowDefinition[];
  context?: Partial<Pick<EngineContext, 'clock' | 'logger' | 'metadata'>>;
}

export function createIntelligenceEngine(options: IntelligenceEngineOptions = {}): IntelligenceEngine {
  const workflows = new InMemoryWorkflowRegistry();
  for (const workflow of options.workflows ?? []) workflows.register(workflow);
  const capabilities = new InMemoryCapabilityRegistry();
  const context: EngineContext = {
    clock: options.context?.clock ?? { now: () => new Date() },
    logger: options.context?.logger ?? {},
    capabilities,
    workflows,
    metadata: { ...(options.context?.metadata ?? {}) },
  };
  const engine: IntelligenceEngine = {
    context,
    async analyze<TInput, TResult = Record<string, unknown>>(input: TInput, options: AnalyzeOptions = {}) {
      const value = typeof input === 'string' ? input : (input as Record<string, unknown>);
      const text = typeof value === 'string' ? value : String(value.text ?? '');
      const semantic = options.semanticObservation ?? buildAnalyticalSemanticVector({ primary: [text], relevance: { [text]: 1 } });
      const temporal = options.temporalInput ? calculateTemporalState(options.temporalInput) : undefined;
      return { text, semantic, ...(temporal ? { temporal } : {}) } as TResult;
    },
    async query<TInput, TResult = Record<string, unknown>>(input: TInput) { return { input, vector: buildAnalyticalSemanticVector({ primary: [String(input)], relevance: { [String(input)]: 1 } }) } as TResult; },
    async evaluate<TInput, TResult = Record<string, unknown>>(input: TInput) { const value = input as Record<string, unknown>; return (value.quranic ? evaluateQuranicMizan(value.payload ?? value) : evaluateMizan(value.payload ?? value)) as TResult; },
    async explain<TInput, TResult = Record<string, unknown>>(input: TInput) { const value = input as Record<string, unknown>; if (value.text && value.timeFactor) return explainTemporalContext(String(value.text), value.timeFactor as Record<string, unknown>) as unknown as TResult; if (value.result) return explainLegalResult(value.result as Record<string, unknown>) as unknown as TResult; return { explanation: 'Analytical evaluation completed under deterministic offline rules.' } as TResult; },
    async execute(workflow, input, workflowContext) {
      if (!workflow.execute) throw new Error(`WORKFLOW_EXECUTOR_UNSUPPORTED_STEPS: ${workflow.id}`);
      if (!workflows.has(workflow.id)) workflows.register(workflow);
      return createWorkflowExecutor(workflows).execute(workflow.id, input, workflowContext);
    },
    use(capability) { capabilities.register(capability); void capability.initialize?.(context); return this; },
    useBundle(bundle) { for (const capability of bundle.capabilities) this.use(capability); for (const workflow of bundle.workflows) if (!workflows.has(workflow.id)) workflows.register(workflow); return this; },
  };
  for (const capability of options.capabilities ?? []) engine.use(capability);
  return engine;
}
