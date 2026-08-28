/**
 * Compatibility shim for the legacy engine path.
 * New consumers should import @moonwitness/mizan-engine.
 */
export {
  calculateEssenceFactor,
  calculateScaleFactor,
  calculateSemanticScaleAffinity,
  calculateXp,
  configureMizanDatasetLoader,
  evaluateMizan,
  evaluateQuranicMizan,
  normalizeScale,
  severityBand,
} from '../../packages/mizan-engine/src/index.js';

export type { Loose, MizanDatasetLoader } from '../../packages/mizan-engine/src/index.js';
