import test from 'node:test';
import assert from 'node:assert/strict';
import { getDemoScenario, listDemoScenarios, type DemoScenarioName } from '../packages/demo-scenarios/src/index.js';

test('demo scenario catalog is deterministic and contains the three supported modes', () => {
  const names = listDemoScenarios().map((scenario) => scenario.name);
  assert.deepEqual(names, ['basic', 'review', 'full']);

  for (const name of names as DemoScenarioName[]) {
    const scenario = getDemoScenario(name);
    assert.equal(scenario.name, name);
    assert.ok(scenario.description.length > 0);
    assert.ok(scenario.entities.length > 0);
    assert.ok(scenario.commands.length > 0);
  }
});

test('full demo scenario uses stable identifiers and command payloads', () => {
  const scenario = getDemoScenario('full');
  const ids = scenario.entities.map((entity) => entity.id);
  assert.deepEqual(ids, ['DEMO-CASE-001', 'DEMO-SUBJECT-001', 'DEMO-EVIDENCE-001']);

  for (const command of scenario.commands) {
    assert.equal(typeof command.command, 'string');
    assert.ok(command.command.length > 0);
    assert.equal(typeof command.payload, 'object');
  }
});
