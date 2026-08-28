import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const appSource = fs.readFileSync('apps/api/src/app.ts', 'utf8');
const workflowSource = fs.readFileSync('packages/orchestrator/src/ai-analysis-workflow.ts', 'utf8');
const adapterSource = fs.readFileSync('apps/api/src/adapters/jobs/register-job-handlers.ts', 'utf8');

test('AI analysis keeps provider selection explicit and versioned across the host adapter', () => {
  assert.match(appSource, /semanticProvider/);
  assert.match(appSource, /registerJobHandlers/);
  assert.match(adapterSource, /modelVersion/);
  assert.match(adapterSource, /MOONWITNESS_RELEASE_VERSION/);
  assert.match(adapterSource, /analyzeWithProvider/);
});

test('AI analysis persists evidence and witness context in the host-neutral workflow', () => {
  assert.match(workflowSource, /persistedEvidence/);
  assert.match(workflowSource, /saveCase/);
  assert.match(workflowSource, /commitWitness/);
  assert.match(workflowSource, /WITNESS_ROOT_MISSING/);
  assert.match(adapterSource, /appendMizanWitness/);
});
