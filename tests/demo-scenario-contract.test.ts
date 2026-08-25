import test from 'node:test';
import assert from 'node:assert/strict';
import { getDemoScenario, listDemoScenarios } from '../packages/demo-scenarios/src/index.js';

test('demo scenarios are named, deterministic, and demo-tagged', () => {
  const scenarios = listDemoScenarios();
  assert.deepEqual(
    scenarios.map((scenario) => scenario.name),
    ['basic', 'review', 'full'],
  );

  for (const scenario of scenarios) {
    assert.ok(scenario.description.length > 0);
    assert.ok(scenario.entities.length > 0);
    for (const entity of scenario.entities) {
      assert.ok(entity.id.startsWith('DEMO-'));
      assert.equal(entity.payload.demo, true);
    }
  }
});

test('full demo scenario is strictly richer than basic', () => {
  const basic = getDemoScenario('basic');
  const full = getDemoScenario('full');
  assert.ok(full.entities.length > basic.entities.length);
  assert.ok(full.commands.length > basic.commands.length);
});

test('unknown demo scenario fails closed', () => {
  assert.throws(() => getDemoScenario('unknown' as never), /Unknown demo scenario/i);
});
