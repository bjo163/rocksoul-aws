import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const npmCommand = process.platform === 'win32' ? process.execPath : 'npm';
const npmPrefix = process.platform === 'win32'
  ? [path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js')]
  : [];

function spawnNpm(args, label) {
  const start = Date.now();
  const result = spawnSync(npmCommand, [...npmPrefix, ...args], {
    cwd: repo,
    stdio: 'inherit',
    shell: false,
    maxBuffer: 50 * 1024 * 1024,
  });
  const durationMs = Date.now() - start;
  const ok = (result.status ?? 0) === 0;
  console.log(`${label}: ${ok ? 'PASS' : 'FAIL'} (${durationMs}ms)`);
  return { ok, status: result.status, durationMs };
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(repo, file), 'utf8'));
}

async function getGitSha() {
  const result = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8', shell: false });
  if (result.status !== 0 || !result.stdout) throw new Error('git rev-parse HEAD failed');
  return result.stdout.trim();
}

async function main() {
  const version = readJson('package.json').version;
  const sha = await getGitSha();
  const timestamp = new Date().toISOString();

  const gates = [
    { name: 'release-identity', args: ['run', 'release:identity'] },
    { name: 'build-packages', args: ['run', 'build:packages'] },
    { name: 'typecheck', args: ['run', 'typecheck'] },
    { name: 'test-release', args: ['run', 'test:release'] },
    { name: 'build-api', args: ['run', 'build:api'] },
    { name: 'test-fastify-adapter', args: ['run', 'test:fastify-adapter'] },
  ];

  const gateResults = {};
  let failed = false;

  for (const gate of gates) {
    console.log(`\n=== GATE: ${gate.name} ===`);
    const result = spawnNpm(gate.args, gate.name);
    gateResults[gate.name] = result;
    if (!result.ok) {
      failed = true;
      console.error(`GATE FAILED: ${gate.name}`);
    }
  }

  const manifest = {
    sha,
    version,
    timestamp,
    gateResults,
    passed: !failed,
  };

  const manifestPath = path.join(repo, 'scripts', '.release-candidate-manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
  console.log(`\nManifest written to ${manifestPath}`);

  if (failed) {
    console.error('\nRELEASE CANDIDATE: FAILED');
    process.exit(1);
  }
  console.log('\nRELEASE CANDIDATE: PASSED');
}

main().catch((error) => {
  console.error('Release candidate script error:', error);
  process.exit(1);
});
