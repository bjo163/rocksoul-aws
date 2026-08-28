import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const docker = fs.readFileSync('Dockerfile', 'utf8');
const compose = fs.readFileSync('deploy/coolify/docker-compose.yml', 'utf8');

test('Docker build has an explicit production command and working directory', () => {
  assert.match(docker, /WORKDIR/i);
  assert.match(docker, /CMD|ENTRYPOINT/i);
});

test('Coolify deployment does not publish the PostgreSQL port publicly', () => {
  assert.doesNotMatch(compose, /5432:/);
});
