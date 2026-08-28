/**
 * Compatibility shim. Review policy now lives in the public orchestrator
 * package so hosts do not import the legacy root source tree.
 */
export {
  createReview,
  transitionReview,
  type HumanDisposition,
  type ReviewRecord,
  type ReviewStatus,
} from '@moonwitness/orchestrator';
