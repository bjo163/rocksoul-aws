import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

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
  assert.match(runnerDoc, /AWS/i);
});

test('certification publishes verified provenance and immutable local container identity', () => {
  assert.match(workflow, /Generate verified release provenance/);
  assert.match(workflow, /release-provenance\.json/);
  assert.match(workflow, /release:provenance -- --verify/);
  assert.match(workflow, /AWS_CONTAINER_IMAGE_V1/);
  assert.match(workflow, /docker image inspect/);
  assert.match(workflow, /actions\/upload-artifact@v4/);
});

test('release evidence can identify the exact repository HEAD', () => {
  const sha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  assert.match(sha, /^[0-9a-f]{40}$/);
});
