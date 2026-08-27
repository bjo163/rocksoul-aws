import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { discoverWorkspacePackageFiles } from '../scripts/workspace-discovery.ts';

test('release identity discovers declared workspace manifests without stale workspace references', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cosmic-release-workspaces-'));
  try {
    fs.mkdirSync(path.join(root, 'apps', 'api'), { recursive: true });
    fs.mkdirSync(path.join(root, 'packages', 'tse-engine'), { recursive: true });
    fs.writeFileSync(path.join(root, 'apps', 'api', 'package.json'), '{}');
    fs.writeFileSync(path.join(root, 'packages', 'tse-engine', 'package.json'), '{}');

    assert.deepEqual(discoverWorkspacePackageFiles(root, { workspaces: ['packages/*', 'apps/*'] }), [
      'apps/api/package.json',
      'packages/tse-engine/package.json',
    ]);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('release identity rejects invalid workspace declarations instead of silently skipping checks', () => {
  assert.throws(
    () => discoverWorkspacePackageFiles(process.cwd(), { workspaces: [] }),
    /RELEASE_WORKSPACES_INVALID/
  );
});
