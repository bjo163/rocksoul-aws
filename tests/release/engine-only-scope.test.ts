import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// Release contracts must be self-contained. Product UI repositories are
// separate deployment targets and must never be required to certify the API.
const mandatoryReleaseFiles = [
  'scripts/release-candidate.mjs',
  'scripts/release-check.mjs',
  'scripts/platform-contract-suite.mjs',
  'tests/api-entity-boundary-contract.test.ts',
  'tests/release/persistence/index.test.ts',
  'tests/release/production/index.test.ts',
];

const removedUiPath = ['apps', 'cab', 'src', 'lib', 'api.ts'].join('/');

test('mandatory release contracts do not depend on removed product applications', () => {
  const missing = mandatoryReleaseFiles.filter((file) => !fs.existsSync(file));
  assert.deepEqual(missing, [], `mandatory release file missing: ${missing.join(', ')}`);

  const stale = mandatoryReleaseFiles.filter((file) => fs.readFileSync(file, 'utf8').includes(removedUiPath));
  assert.deepEqual(stale, [], `release contract has a stale product-app dependency: ${stale.join(', ')}`);
});

test('reference API boundary contract remains backend-owned', () => {
  const source = fs.readFileSync('tests/api-entity-boundary-contract.test.ts', 'utf8');
  assert.match(source, /apps\/api\/src\/routes\/entities\.routes\.ts/);
  assert.match(source, /packages\/persistence\/src\/types\.ts/);
});
