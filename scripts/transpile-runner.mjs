import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mw-build-'));
const copyDirs = ['.github', 'src', 'packages', 'tests', 'scripts', 'apps', 'docs', 'deploy'];
const rootFiles = [
  'Dockerfile',
  'docker-compose.yml',
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  'tsconfig.base.json',
];
fs.writeFileSync(path.join(tmp, 'package.json'), JSON.stringify({ type: 'module' }));
// Windows directory symlinks require developer mode/elevation; junctions do not.
// Keep the temporary runner portable while preserving the same module resolution.
fs.symlinkSync(
  path.join(repo, 'node_modules'),
  path.join(tmp, 'node_modules'),
  process.platform === 'win32' ? 'junction' : 'dir'
);
// Release-evidence contracts inspect the repository HEAD. Keep the real Git metadata
// visible without copying or mutating it so the isolated filesystem still resolves
// `git rev-parse HEAD` to the exact source checkout being tested.
const gitDir = path.join(repo, '.git');
if (fs.existsSync(gitDir)) {
  fs.symlinkSync(gitDir, path.join(tmp, '.git'), process.platform === 'win32' ? 'junction' : 'dir');
}
function walk(dir) {
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    if (name === 'node_modules' || name === 'dist') continue;
    const full = path.join(dir, name); const stat = fs.statSync(full);
    if (stat.isDirectory()) out.push(...walk(full)); else out.push(full);
  }
  return out;
}
for (const dir of copyDirs) {
  for (const file of walk(path.join(repo, dir))) {
    const rel = path.relative(repo, file); const target = path.join(tmp, rel);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    if (file.endsWith('.ts')) {
      const source = fs.readFileSync(file, 'utf8');
      const out = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, sourceMap: false } }).outputText;
      fs.writeFileSync(target.replace(/\.ts$/, '.js'), out);
      fs.writeFileSync(target, source);
    } else fs.copyFileSync(file, target);
  }
}
for (const file of rootFiles) {
  const source = path.join(repo, file);
  if (!fs.existsSync(source)) continue;
  fs.copyFileSync(source, path.join(tmp, file));
}
for (const extra of ['data', 'schemas', 'config']) {
  fs.cpSync(path.join(repo, extra), path.join(tmp, extra), { recursive: true });
}
const testFiles = args.length ? args : [];
for (const file of testFiles) {
  const target = path.join(tmp, file.replace(/\.ts$/, '.js'));
  const result = spawnSync(process.execPath, ['--test', target], { cwd: tmp, stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
