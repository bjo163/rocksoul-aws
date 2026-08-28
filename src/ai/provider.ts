type Loose = Record<string, any>;
import { RegistrySemanticProvider as RegistrySemanticEngineProvider } from './semantic-engine.js';
import { assertGovernedAiInput, resolveAiGovernance, withAiTimeout } from './governance.js';
/**
 * Provider boundary for semantic analysis.
 * Source code never classifies domain actions by keyword; providers return
 * structured semantic observations that the generic analyzer consumes.
 */
export class AiProvider {
  declare name: string;
  declare capabilities: string[];
  constructor({ name = 'abstract', capabilities = [] }: Loose = {}) {
    this.name = name;
    this.capabilities = [...capabilities];
  }
  async analyze(_text?: string, _options?: Loose): Promise<any> {
    throw new Error(`AI provider '${this.name}' requires an implementation`);
  }
}


export class LocalStructuredProvider extends AiProvider {
  declare analyzeFn: (text: string, options: Loose) => Promise<any> | any;
  constructor(analyzeFn: (text: string, options: Loose) => Promise<any> | any) {
    super({ name: 'local-structured', capabilities: ['semantic-contract'] });
    this.analyzeFn = analyzeFn;
  }
  async analyze(text: string, options: Loose = {}): Promise<any> { return this.analyzeFn(text, options); }
}

export class StaticSemanticProvider extends AiProvider {
  declare observation: Loose;
  constructor(observation: Loose) {
    super({ name: 'static-semantic', capabilities: ['semantic-contract'] });
    this.observation = structuredClone(observation ?? {});
  }
  async analyze(): Promise<Loose> { return structuredClone(this.observation); }
}

export class HttpJsonAiProvider extends AiProvider {
  declare url: string; declare apiKey: string; declare headers: Loose; declare model: any;
  constructor({ url, apiKey = '', headers = {}, name = 'http-json', model = null }: Loose = {}) {
    super({ name, capabilities: ['semantic-contract', 'alternatives', 'conflicts', 'timeline', 'evidence'] });
    if (!url) throw new Error('AI provider URL is required');
    this.url = url;
    this.apiKey = apiKey;
    this.headers = headers;
    this.model = model;
  }
  async analyze(text: string, options: Loose = {}): Promise<any> {
    assertGovernedAiInput(text, options.governance);
    const body = { text, options, response_format: 'semantic_observation_v1', model: this.model };
    const policy = resolveAiGovernance(options.governance);
    if (!policy.allowRemote) throw new Error('AI_REMOTE_PROVIDER_DISABLED');
    const response = await withAiTimeout(() => fetch(this.url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(this.apiKey ? { authorization: `Bearer ${this.apiKey}` } : {}), ...this.headers },
      body: JSON.stringify(body)
    }), policy);
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(`AI provider request failed (${response.status})`);
    return payload.semanticObservation ?? payload.observation ?? payload;
  }
}

export function providerDescriptor(provider: Loose): Loose {
  return { name: provider.name, capabilities: [...provider.capabilities] };
}

export class RegistrySemanticProvider extends AiProvider {
  private readonly engine: RegistrySemanticEngineProvider;
  constructor(root = process.cwd()) {
    super({ name: 'moonwitness-registry-semantic', capabilities: ['semantic-contract','registry-grounded','offline','deterministic'] });
    this.engine = new RegistrySemanticEngineProvider(root);
  }
  async analyze(text: string, options: Loose = {}): Promise<any> { return this.engine.analyze(text, options); }
}

export function createDefaultSemanticProvider(root = process.cwd()): AiProvider {
  return new RegistrySemanticProvider(root);
}
