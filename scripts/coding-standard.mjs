import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

const exec = promisify(execFile);
const roots = ['src', 'apps', 'packages', 'scripts', 'tests'];
const extensions = new Set(['.ts', '.tsx', '.mts', '.cts', '.js', '.mjs', '.cjs']);
const ignored = new Set(['node_modules', 'dist', 'build', '.next', 'coverage', '.git']);
const standardFile = relative('.', 'scripts/coding-standard.mjs');
const violations = [];

const compatibilityAllowlist = new Map([
  ['apps/api/src/router.ts', new Set([11])],
  ['apps/api/src/app.ts', new Set([110, 117, 122, 134])],
]);

function checkLine(path, line, lineNumber) {
  if (path === standardFile) return;
  if (compatibilityAllowlist.get(path)?.has(lineNumber)) return;
  if (/^\s*\/\/\s*@ts-nocheck\b/.test(line)) violations.push(`${relative('.', path)}:${lineNumber}: @ts-nocheck is forbidden`);
  if (/\bas any\b/.test(line)) violations.push(`${relative('.', path)}:${lineNumber}: explicit 'as any' is forbidden`);
  if (/\bany\[\]\b|:\s*any\b|<any>/.test(line)) violations.push(`${relative('.', path)}:${lineNumber}: explicit any type is forbidden`);
}

async function inspect(path, onlyAddedLines = null) {
  const text = await readFile(path, 'utf8');
  text.split(/\r?\n/).forEach((line, index) => {
    const lineNumber = index + 1;
    if (!onlyAddedLines || onlyAddedLines.has(lineNumber)) checkLine(path, line, lineNumber);
  });
}

async function walk(dir) {
  let entries;
  try { entries = await readdir(dir, { withFileTypes: true }); } catch { return; }
  for (const entry of entries) {
    if (ignored.has(entry.name)) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) await walk(path);
    else if (extensions.has(path.slice(path.lastIndexOf('.')))) await inspect(path);
  }
}

async function gitOutput(args) {
  try {
    const { stdout } = await exec('git', args);
    return stdout.trim();
  } catch {
    return '';
  }
}

async function gitFetch(args) {
  try {
    await exec('git', args);
    return true;
  } catch {
    return false;
  }
}

async function resolveBase() {
  const explicitSha = process.env.PR_BASE_SHA || process.env.GITHUB_BASE_SHA;
  if (explicitSha && /^[0-9a-f]{40}$/i.test(explicitSha)) {
    if (await gitFetch(['fetch', '--no-tags', '--prune', 'origin', explicitSha])) {
      const reachable = await gitOutput(['cat-file', '-e', `${explicitSha}^{commit}`]);
      const mergeBase = await gitOutput(['merge-base', explicitSha, 'HEAD']);
      if (reachable && mergeBase) return explicitSha;
    }
  }

  const baseRef = process.env.PR_BASE_REF || process.env.GITHUB_BASE_REF || 'main';
  const remoteRef = `refs/remotes/origin/${baseRef}`;

  const candidates = [
    remoteRef,
    `origin/${baseRef}`,
    baseRef,
  ];

  for (const candidate of candidates) {
    const mergeBase = await gitOutput(['merge-base', candidate, 'HEAD']);
    if (mergeBase) return candidate;
  }

  if (await gitFetch(['fetch', '--no-tags', '--prune', 'origin', `+refs/heads/${baseRef}:${remoteRef}`])) {
    const mergeBase = await gitOutput(['merge-base', remoteRef, 'HEAD']);
    if (mergeBase) return remoteRef;
  }

  if (await gitFetch(['fetch', '--no-tags', '--prune', 'origin', 'main'])) {
    const fallbackRef = baseRef === 'main' ? 'FETCH_HEAD' : `refs/remotes/origin/${baseRef}`;
    const mergeBase = await gitOutput(['merge-base', fallbackRef, 'HEAD']);
    if (mergeBase) return fallbackRef;
  }

  return null;
}

async function inspectPullRequestChanges() {
  const base = await resolveBase();
  if (!base) {
    console.error(`Unable to resolve coding-standard base. event=${process.env.GITHUB_EVENT_NAME || 'local'} baseSha=${process.env.PR_BASE_SHA || process.env.GITHUB_BASE_SHA || '(none)'} baseRef=${process.env.PR_BASE_REF || process.env.GITHUB_BASE_REF || 'main'} head=${await gitOutput(['rev-parse', 'HEAD']) || '(unknown)'}`);
    return false;
  }

  const mergeBase = await gitOutput(['merge-base', base, 'HEAD']);
  console.log(`Coding-standard base resolved: ${base} (merge-base ${mergeBase})`);

  const { stdout } = await exec('git', ['diff', '--unified=0', `${base}...HEAD`, '--', ...roots]);
  let currentFile = null;
  let newLine = 0;
  const added = new Map();

  for (const rawLine of stdout.split(/\r?\n/)) {
    if (rawLine.startsWith('+++ b/')) {
      currentFile = rawLine.slice(6);
      if (currentFile === standardFile) currentFile = null;
      continue;
    }
    if (rawLine.startsWith('@@')) {
      const match = rawLine.match(/\+(\d+)(?:,(\d+))?/);
      newLine = match ? Number(match[1]) : 0;
      continue;
    }
    if (!currentFile || !rawLine.startsWith('+') || rawLine.startsWith('+++')) continue;
    if (!added.has(currentFile)) added.set(currentFile, new Set());
    added.get(currentFile).add(newLine);
    newLine += 1;
  }

  for (const [path, lines] of added) {
    if (extensions.has(path.slice(path.lastIndexOf('.')))) await inspect(path, lines);
  }
  return true;
}

const ratchetMode = await inspectPullRequestChanges();
if (!ratchetMode) {
  const isCi = process.env.CI === 'true' || Boolean(process.env.GITHUB_ACTIONS);
  if (isCi) {
    console.error('Coding-standard cannot establish a reachable PR base. CI must provide a reachable PR_BASE_SHA/PR_BASE_REF or GITHUB_BASE_SHA/GITHUB_BASE_REF.');
    process.exit(1);
  }
  console.warn('No PR base detected; running full repository coding-standard scan locally.');
  for (const root of roots) await walk(root);
}

if (violations.length) {
  console.error(`Coding standard failed: ${violations.length} violation(s)`);
  console.error(violations.join('\n'));
  process.exit(1);
}

console.log(ratchetMode
  ? 'Coding standard passed: no new forbidden TypeScript escape hatches introduced by this pull request.'
  : 'Coding standard passed: no forbidden TypeScript escape hatches found.');
