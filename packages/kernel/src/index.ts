/**
 * Transitional kernel facade.
 * Runtime implementations remain under src/core and src/backend until each
 * module can be moved without widening the dependency graph.
 */
export * from '../../../src/core/boundaries.js';
export * from '../../../src/core/ids.js';
export * from '../../../src/core/rid.js';
export * from '../../../src/core/versioning.js';
export * from '../../../src/core/state-machine.js';
export * from '../../../src/core/relationship-hub.js';
export * from '../../../src/core/rule-resolution.js';
export * from '../../../src/core/compatibility.js';
export * from '../../../src/backend/domain-types.js';
export * from '../../../src/backend/model-registry.js';
