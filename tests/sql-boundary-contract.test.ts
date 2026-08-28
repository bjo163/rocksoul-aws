import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const sourceRoots = ['apps', 'src', 'packages'];
const sqlPattern = /\b(?:SELECT\s+[\w*]|INSERT\s+INTO|UPDATE\s+[A-Za-z_]\w*\s+SET|DELETE\s+FROM|CREATE\s+(?:TABLE|INDEX)|ALTER\s+TABLE|DROP\s+TABLE|TRUNCATE\s+)\b/i;
const ddlPattern = /\b(?:CREATE\s+(?:TABLE|INDEX)|ALTER\s+TABLE|DROP\s+TABLE|TRUNCATE\s+)\b/i;
const interpolatedStatementPattern = /\.(?:query|prepare|exec)\(\s*`[^`]*\$\{/gs;

const approvedSqlAdapters = new Set([
  'packages/persistence/src/postgres.ts',
  'packages/persistence/src/schema.ts',
  'src/access/postgres-auth.ts',
  'src/ledger/witness-projection-store.ts',
  'src/persistence/postgres-idempotency.ts',
  'packages/persistence/src/postgres-idempotency.ts',
  'packages/witness/src/witness-projection-store.ts',
]);

function sourceFiles(directory: string): string[] {
  if (!fs.existsSync(directory)) return [];
  const results: string[] = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (['dist', 'node_modules', 'old'].includes(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) results.push(...sourceFiles(absolute));
    else if (/\.(?:ts|tsx|js|mjs)$/.test(entry.name)) results.push(absolute);
  }
  return results;
}

function isDataBoundarySource(relative: string): boolean {
  // JSX/view components are presentation code, not approved data adapters.
  // Keep the scanner focused on source files capable of implementing a data boundary.
  if (relative.endsWith('.tsx')) return false;
  return true;
}

test('business actions contain no SQL and use approved repositories/adapters', () => {
  const violations: string[] = [];
  const discoveredAdapters = new Set<string>();
  for (const sourceRoot of sourceRoots) {
    for (const absolute of sourceFiles(path.join(root, sourceRoot))) {
      const relative = path.relative(root, absolute).replaceAll('\\', '/');
      if (!isDataBoundarySource(relative)) continue;
      const logicalRelative = relative.endsWith('.js') ? `${relative.slice(0, -3)}.ts` : relative;
      const text = fs.readFileSync(absolute, 'utf8');
      if (!sqlPattern.test(text)) continue;
      discoveredAdapters.add(logicalRelative);
      if (!approvedSqlAdapters.has(logicalRelative)) violations.push(relative);
    }
  }
  assert.deepEqual(violations, [], `SQL escaped the approved data-adapter boundary: ${violations.join(', ')}`);
  assert.deepEqual([...discoveredAdapters].sort(), [...approvedSqlAdapters].sort(), 'Review and explicitly classify every source file containing SQL');
});

test('runtime repositories contain no schema DDL outside migration bootstrap', () => {
  const violations: string[] = [];
  for (const relative of approvedSqlAdapters) {
    if (relative === 'packages/persistence/src/schema.ts') continue;
    const lines = fs.readFileSync(path.join(root, relative), 'utf8').split(/\r?\n/);
    lines.forEach((line, index) => {
      if (ddlPattern.test(line) && !line.includes('schema_migrations')) violations.push(`${relative}:${index + 1}`);
    });
  }
  assert.deepEqual(violations, [], `Schema DDL must stay in the migration registry: ${violations.join(', ')}`);
});

test('database adapters never interpolate runtime values into SQL statements', () => {
  const violations: string[] = [];
  for (const relative of approvedSqlAdapters) {
    if (relative === 'packages/persistence/src/schema.ts') continue;
    const text = fs.readFileSync(path.join(root, relative), 'utf8');
    if (interpolatedStatementPattern.test(text)) violations.push(relative);
    interpolatedStatementPattern.lastIndex = 0;
  }
  assert.deepEqual(violations, [], `Use driver placeholders for every runtime SQL value: ${violations.join(', ')}`);
});
