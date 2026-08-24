import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

const roots = ['src', 'apps', 'packages', 'scripts', 'tests'];
const extensions = new Set(['.ts', '.tsx', '.mts', '.cts', '.js', '.mjs', '.cjs']);
const ignored = new Set(['node_modules', 'dist', 'build', '.next', 'coverage', '.git']);
const violations = [];

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

async function inspect(path) {
  const text = await readFile(path, 'utf8');
  const lines = text.split(/\r?\n/);
  lines.forEach((line, index) => {
    const n = index + 1;
    if (/^\s*\/\/\s*@ts-nocheck\b/.test(line)) violations.push(`${relative('.', path)}:${n}: @ts-nocheck is forbidden`);
    if (/\bas any\b/.test(line)) violations.push(`${relative('.', path)}:${n}: explicit 'as any' is forbidden`);
    if (/\bany\[\]\b|:\s*any\b|<any>/.test(line)) violations.push(`${relative('.', path)}:${n}: explicit any type is forbidden`);
  });
}

for (const root of roots) await walk(root);
if (violations.length) {
  console.error(`Coding standard failed: ${violations.length} violation(s)`);
  console.error(violations.join('\n'));
  process.exit(1);
}
console.log('Coding standard passed: no forbidden TypeScript escape hatches found.');
