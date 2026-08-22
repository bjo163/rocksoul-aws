type Loose = Record<string, any>;
import { buildAiAnalysis, analyzeWithProvider, analyzeAutomatically } from './general-analyzer.js';
import { RegistrySemanticProvider, StaticSemanticProvider, createDefaultSemanticProvider } from './provider.js';

/** Synchronous core: consumes a semantic observation already available. */
export function analyzeText(text: string, opts: Loose = {}): Loose {
  return buildAiAnalysis(text, opts);
}

/** Full automatic path: natural language -> registry semantic engine -> Mizan. */
export async function analyzeTextAutomatic(text: string, opts: Loose = {}): Promise<Loose> {
  const provider = opts.provider ?? createDefaultSemanticProvider(opts.root ?? process.cwd());
  return analyzeWithProvider(text, { ...opts, provider });
}

export { analyzeWithProvider, analyzeAutomatically, StaticSemanticProvider, RegistrySemanticProvider, createDefaultSemanticProvider };
