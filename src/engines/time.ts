/**
 * Compatibility shim. New consumers should import @moonwitness/temporal-engine.
 */
export { compareTime, makeTimeEvent, now } from '../../packages/temporal-engine/src/index.js';
export type { MakeTimeEventInput, TemporalScope, TimeEvent } from '../../packages/temporal-engine/src/index.js';
