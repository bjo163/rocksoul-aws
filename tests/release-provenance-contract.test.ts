import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const repo = process.cwd();
const run = (args: string[]) => spawnSync(process.execPath, ['scripts/release-provenance.mjs', ...args], { cwd: repo, encoding: 'utf8' });

test('release provenance emits deterministic SBOM and artifact integrity manifest', () => {
  const first = run([]); const second = run([]);
  assert.equal(first.status, 0); assert.equal(first.stdout, second.stdout);
  const manifest = JSON.parse(first.stdout);
  assert.equal(manifest.protocol, 'COSMIC_RELEASE_PROVENANCE_V1');
  assert.equal(manifest.integrity.algorithm, 'SHA-256');
  assert.ok(manifest.sbom.components.length > 0);
  assert.ok(manifest.artifacts.some((item: { path?: string }) => item.path === 'package-lock.json'));
});

test('release provenance verifier detects manifest tampering', () => {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'mw-release-provenance-')), 'manifest.json');
  assert.equal(run(['--output', file]).status, 0);
  assert.equal(run(['--verify', file]).status, 0);
  const manifest = JSON.parse(fs.readFileSync(file, 'utf8')); manifest.release.version = 'tampered'; fs.writeFileSync(file, JSON.stringify(manifest));
  assert.notEqual(run(['--verify', file]).status, 0);
});
