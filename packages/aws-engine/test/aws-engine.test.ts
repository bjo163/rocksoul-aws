import assert from 'node:assert/strict';
import test from 'node:test';
import { createAwsEngine, toAwsSemanticObservation } from '../src/index.js';

test('canonical AWS engine facade is available', async () => {
  assert.strictEqual(typeof createAwsEngine, 'function');
  const observation = toAwsSemanticObservation({ status: 'UNKNOWN' });
  assert.equal(observation.protocol, 'AWS_SEMANTIC_OBSERVATION_V1');
  assert.equal(observation.status, 'UNAVAILABLE');
  assert.match(observation.metadata.provider, /^aws-/);
});
