import { evaluateMizan } from '../engines/mizan.js';
import type { MizanInput, MizanResult } from '../contracts/mizan.js';

/**
 * Stable application boundary around the existing Mizan formula.
 * The service deliberately delegates scoring to src/engines/mizan.ts so the
 * engine remains the single source of truth for calculation semantics.
 */
export function evaluateMizanService(input: MizanInput): MizanResult {
  return evaluateMizan(input as Parameters<typeof evaluateMizan>[0]) as MizanResult;
}
