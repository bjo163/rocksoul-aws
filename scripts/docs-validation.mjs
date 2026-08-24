import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const required = [
  'README.md',
  'docs/README.md',
  'docs/TODO.md',
  'docs/DEPENDENCY_MANAGEMENT.md',
  'docs/RELEASE_CHECKLIST.md',
];

for (const file of required) {
  if (!existsSync(file) || readFileSync(file, 'utf8').trim() === '') {
    throw new Error(`Missing or empty documentation: ${file}`);
  }
}

const files = ['README.md', ...collectMarkdown('docs')];
const linkRe = /(?<!!)(?<!\[)\[[^\]]+\]\(([^)]+)\)/g;
const errors = [];

for (const file of files) {
  const lines = readFileSync(file, 'utf8').split(/\r?\n/);
  let inFence = false;
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    for (const match of line.matchAll(linkRe)) {
      let target = match[1].trim().split('#', 1)[0];
      target = target.split('?', 1)[0];
      if (!target || target.startsWith(('#', '/', 'mailto:')) || target.includes('://')) continue;
      const candidate = path.resolve(path.dirname(file), target);
      if (!existsSync(candidate)) errors.push(`${file}:${i + 1}: ${target}`);
    }
  }
}

writeFileSync('docs-link-errors.txt', errors.length ? `${errors.join('\n')}\n` : '', 'utf8');
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`Documentation validation passed for ${files.length} Markdown files.`);

function collectMarkdown(root) {
  const result = [];
  walk(root, result);
  return result;
}

function walk(directory, result) {
  for (const entry of readdirSync(directory)) {
    const full = path.join(directory, entry);
    if (entry.endsWith('.md') && statSync(full).isFile()) result.push(full);
    else if (statSync(full).isDirectory()) walk(full, result);
  }
}
