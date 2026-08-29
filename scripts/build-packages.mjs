import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packagesRoot = path.join(repo, 'packages');
const order = [
  'contracts', 'persistence', 'observability', 'security', 'domains', 'witness', 'jobs', 'data-access', 'kernel',
  'revelation', 'temporal-engine', 'semantic-engine', 'mizan-engine',
  'explanation-engine', 'tse-engine', 'workflow', 'orchestrator', 'application', 'intelligence', 'cosmic-engine', 'sdk',
];
// These facades still bridge legacy root src/ modules. They remain available to
// the transpile runner until that compatibility boundary is retired.
const sourceBridged = new Set();
const npmCommand = process.execPath;
const npmArgs = [path.join(repo, 'node_modules', 'typescript', 'bin', 'tsc')];

function sourceFiles(dir) {
  const files = [];
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) files.push(...sourceFiles(full));
    else if (name.endsWith('.ts') && !name.endsWith('.d.ts')) files.push(full);
  }
  return files;
}

for (const name of order) {
  if (sourceBridged.has(name)) {
    console.log(`Skipping ${name}: legacy source bridge requires transpile runner.`);
    continue;
  }
  const packageRoot = path.join(packagesRoot, name);
  const sourceRoot = path.join(packageRoot, 'src');
  if (!fs.existsSync(sourceRoot)) continue;
  console.log(`Building @moonwitness/${name}...`);
  fs.rmSync(path.join(packageRoot, 'dist'), { recursive: true, force: true });
  const args = [
    ...npmArgs,
    '--target', 'ES2022', '--module', 'NodeNext', '--moduleResolution', 'NodeNext',
    '--rootDir', 'src', '--outDir', 'dist', '--declaration', '--sourceMap',
    '--strict', '--skipLibCheck',
    ...sourceFiles(sourceRoot).map((file) => path.relative(packageRoot, file)),
  ];
  const result = spawnSync(npmCommand, args, { cwd: packageRoot, stdio: 'inherit', shell: false });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log(`Built ${order.length} workspace packages into dist/.`);
