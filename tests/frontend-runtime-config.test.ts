import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const files = [
  'apps/web/src',
  'apps/cab/src',
  'apps/xrp/src',
  'apps/flow/src',
];

function walk(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = `${dir}/${entry.name}`;
    if (entry.isDirectory()) out.push(...walk(full));
    else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

test('frontend applications do not hardcode localhost production API URLs', () => {
  const source = files.flatMap(walk).map((file) => fs.readFileSync(file, 'utf8')).join('\n');
  assert.doesNotMatch(source, /https?:\/\/localhost(?::\d+)?\/api/);
  assert.doesNotMatch(source, /https?:\/\/127\.0\.0\.1(?::\d+)?\/api/);
});
