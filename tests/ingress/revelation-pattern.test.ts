import test from 'node:test';
import assert from 'node:assert/strict';
import {
  chooseReminderPattern,
  loadRevelationPatternRegistry,
  loadRevelationResearchSources,
  selectSimulatedPassageSize,
} from '../../src/ingress/revelation-pattern-engine.js';

test('revelation registry loads with source provenance', async () => {
  const registry = await loadRevelationPatternRegistry();
  const sources = await loadRevelationResearchSources();
  assert.equal(registry.version, 1);
  assert.equal(registry.policy.defaultUnit, 'SINGLE_AYAH');
  assert.ok(registry.patterns.length >= 6);
  assert.ok(sources.sources.length >= 4);
});

test('simulation distribution prefers single ayah without claiming historical statistics', () => {
  assert.equal(selectSimulatedPassageSize(0), 'SINGLE_AYAH');
  assert.equal(selectSimulatedPassageSize(69), 'SINGLE_AYAH');
  assert.equal(selectSimulatedPassageSize(70), 'SHORT_PASSAGE_2_5');
  assert.equal(selectSimulatedPassageSize(92), 'PASSAGE_6_10');
  assert.equal(selectSimulatedPassageSize(99), 'LARGE_PASSAGE_GT10');
});

test('large disputed report is never chosen by automatic selector as a special rule', async () => {
  const registry = await loadRevelationPatternRegistry();
  const selected = chooseReminderPattern(registry, 99);
  assert.notEqual(selected.id, 'RP-LARGE-REPORT-001');
});
