import assert from 'node:assert/strict';
import test from 'node:test';
import { createIntelligenceEngine, defineBundle } from '../src/index.js';
import { defineWorkflow } from '@moonwitness/workflow';

test('intelligence engine supports direct analysis, workflows, capabilities, and bundles', async () => {
  const workflow = defineWorkflow({ id: 'example', version: '1.0.0', execute: async (input: { value: number }) => input.value + 1 });
  const engine = createIntelligenceEngine();
  engine.useBundle(defineBundle({ id: 'research', version: '1.0.0', capabilities: [{ id: 'semantic', version: '1', capabilities: ['semantic'] }], workflows: [workflow] }));
  assert.equal((await engine.execute(workflow, { value: 1 }, {})).output, 2);
  assert.equal((await engine.analyze({ text: 'hello' })).text, 'hello');
  assert.equal(engine.context.capabilities.list().length, 1);
});
