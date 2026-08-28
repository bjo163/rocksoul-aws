import assert from 'node:assert/strict';
import test from 'node:test';
import { classifyBump, nextVersion, parseVersion } from '../scripts/release-version.mjs';

test('release versioning follows conventional commit precedence', () => {
  assert.equal(classifyBump(['docs: clarify a boundary']), null);
  assert.equal(classifyBump(['fix(api): handle malformed input']), 'patch');
  assert.equal(classifyBump(['fix(api): handle malformed input', 'feat(engine): add public facade']), 'minor');
  assert.equal(classifyBump(['feat!: replace the API contract']), 'major');
  assert.equal(classifyBump(['feat(api): change\n\nBREAKING CHANGE: old route removed']), 'major');
});

test('release versioning produces valid semver increments', () => {
  assert.deepEqual(parseVersion('4.33.0'), { major: 4, minor: 33, patch: 0 });
  assert.equal(nextVersion('4.33.0', 'patch'), '4.33.1');
  assert.equal(nextVersion('4.33.0', 'minor'), '4.34.0');
  assert.equal(nextVersion('4.33.0', 'major'), '5.0.0');
  assert.throws(() => parseVersion('4.33'));
});
