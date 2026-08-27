import { buildAiAnalysis } from '../../../src/ai/general-analyzer.js';
import { createDefaultSemanticProvider } from '../../../src/ai/provider.js';
import { evaluateMizanService } from '../../../src/services/mizan-service.js';
import { calculateTemporalState, toMizanTemporalContext, type TSEInput } from '../../tse-engine/src/index.js';

export { calculateTemporalState, toMizanTemporalContext } from '../../tse-engine/src/index.js';
export { evaluateMizanService } from '../../../src/services/mizan-service.js';
export type { MizanInput, MizanResult, MizanTemporalContext } from '../../../src/contracts/mizan.js';
export type { TSEInput, TSETemporalState } from '../../tse-engine/src/index.js';

/**
 * Minimal integration facade for Moonwitness and other hosts.
 * It contains no UI, persistence, authentication, or platform workflow API.
 */
export function createCosmicEngine(root = process.cwd()) {
  const semanticProvider = createDefaultSemanticProvider(root);
  return Object.freeze({
    calculateTemporalState(input: TSEInput) {
      return calculateTemporalState(input);
    },
    async analyzeSemantic(text: string) {
      return semanticProvider.analyze(text);
    },
    evaluateMizan: evaluateMizanService,
    async analyze(text: string, temporalInput?: TSEInput) {
      const semanticObservation = await semanticProvider.analyze(text);
      const timeFactor = temporalInput ? toMizanTemporalContext(calculateTemporalState(temporalInput)) : semanticObservation.timeFactor;
      return buildAiAnalysis(text, { root, semanticObservation: { ...semanticObservation, timeFactor } });
    },
  });
}
