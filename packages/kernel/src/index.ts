/** Canonical kernel primitives. Keep the remaining bridges isolated below. */
export * from './boundaries.js';
export * from './ids.js';
export * from './rid.js';
export * from './versioning.js';
export * from './state-machine.js';
export * from './compatibility.js';

// These two modules still depend on legacy domain implementations. They are
// intentionally isolated until their identity/wealth dependencies are moved
// into packages as well; consumers retain the stable kernel API meanwhile.
export * from '../../../src/core/relationship-hub.js';
export * from '../../../src/core/rule-resolution.js';
export * from '../../../src/backend/domain-types.js';
export * from '../../../src/backend/model-registry.js';
