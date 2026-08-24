import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const workflow = fs.readFileSync('.github/workflows/certification.yml', 'utf8');
const runnerDoc = fs.readFileSync('docs/operations/SELF_HOSTED_CI.md', 'utf8');

test('certification workflow checks out the exact commit and never uses a floating ref', () => {
  assert.match(workflow, /actions\/checkout@v4/);
  assert.match(workflow, /fetch-depth:\s*0/);
  assert.doesNotMatch(workflow, /git checkout main/);
  assert.doesNotMatch(workflow, /git checkout dev/);
});

test('self-hosted certification contract requires same-SHA evidence', () => {
  assert.match(runnerDoc, /same-SHA/i);
  assert.match(runnerDoc, /self-hosted/i);
  assert.match(runnerDoc, /cosmic/i);
});
