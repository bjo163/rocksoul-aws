import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const roots = ['src', 'apps', 'packages'];
const sourceExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
const violations = [];

async function walk(dir) {
  let entries = [];
  try { entries = await readdir(dir, { withFileTypes: true }); } catch { return; }
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.next' || entry.name.startsWith('.')) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) await walk(path);
    else if (sourceExtensions.has(path.slice(path.lastIndexOf('.')))) {
      const text = await readFile(path, 'utf8');
      const imports = [...text.matchAll(/(?:from\s+|import\s*\(\s*|require\(\s*)["']([^"']+)["']/g)].map((m) => m[1]);
      for (const specifier of imports) {
        if (specifier.startsWith('apps/') || specifier.startsWith('packages/')) {
          violations.push(`${path}: cross-workspace absolute import ${specifier}`);
        }
        if (specifier.includes('/apps/')) {
          violations.push(`${path}: cross-app import ${specifier}`);
        }
      }
    }
  }
}

for (const root of roots) await walk(root);

if (violations.length) {
  console.error('Architecture boundary violations:');
  for (const violation of violations) console.error(`- ${violation}`);
  process.exit(1);
}

console.log('Architecture boundary check passed.');
