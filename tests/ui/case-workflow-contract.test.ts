import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const workflow = fs.readFileSync('apps/cab/src/components/CaseWorkflow.tsx', 'utf8');
const api = fs.readFileSync('apps/cab/src/lib/api.ts', 'utf8');
const app = fs.readFileSync('apps/cab/src/App.tsx', 'utf8');
const locale = fs.readFileSync('apps/cab/src/locales/en.json', 'utf8');
const config = JSON.parse(fs.readFileSync('apps/cab/src/data/ui-config.json', 'utf8'));

test('CAB exposes one guided case workflow from navigation and quick actions', () => {
  assert.ok(config.menus.includes('CASE WORKFLOW'));
  assert.ok(config.quickActions.includes('New Case'));
  assert.match(app, /<CaseWorkflow user=\{user\}/);
  assert.match(workflow, /mw-workflow-grid/);
});

test('guided workflow covers case, evidence, analysis, review, Witness and audit', () => {
  for (const token of [
    'copy.recordCase',
    'copy.attachEvidence',
    'copy.persistAnalysis',
    'copy.humanReview',
    'copy.witnessAudit',
  ]) {
    assert.ok(workflow.includes(token), token);
  }
  for (const method of ['universeObserve', 'attachEvidence', 'universeAnalyze', 'createReview', 'transitionReview', 'witnessStatus', 'resourceAudit']) {
    assert.ok(workflow.includes(`api.${method}`), method);
  }
});

test('workflow API uses versioned persistence and integrity routes', () => {
  for (const route of ['/api/v1/observe', '/api/v1/analyze', '/evidence', '/audit', '/api/v1/reviews', '/api/v1/witness/status']) {
    assert.ok(api.includes(route), route);
  }
});

test('review completion requires rationale and keeps an explicit human disposition', () => {
  assert.match(workflow, /Reviewer rationale is required/);
  assert.match(workflow, /UPHOLD_GATE/);
  assert.match(workflow, /copy\.dispositionNote/);
  assert.match(locale, /Human disposition is operational review\. It does not rewrite the source analysis or become Divine judgement\./);
  assert.doesNotMatch(workflow, /window\.prompt|window\.confirm/);
});
