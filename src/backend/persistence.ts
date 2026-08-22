import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

/**
 * Thin bridge so the ESM legacy/backend runtime can select the CJS persistence package.
 * Domain code never imports SQLite/PostgreSQL directly.
 */
export function createPersistence(options = {}) {
  const { createPersistence: factory } = require('../../packages/persistence/src/factory.js');
  return factory(options);
}
