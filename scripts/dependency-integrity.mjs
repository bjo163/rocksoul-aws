import { readFile } from 'node:fs/promises';

const lock = JSON.parse(await readFile('package-lock.json', 'utf8'));
const root = lock.packages?.[''];
const workspaces = root?.workspaces ?? [];

if (lock.lockfileVersion !== 3) throw new Error(`Expected lockfileVersion 3, got ${lock.lockfileVersion}`);
if (!Array.isArray(workspaces) || workspaces.length === 0) throw new Error('Root package-lock.json must declare workspaces.');

const required = Object.keys(lock.packages ?? {}).filter((workspace) => /^(apps|packages)\/[^/]+$/.test(workspace));
const missing = required.filter((workspace) => !lock.packages?.[workspace]);
if (missing.length) {
  console.error(`Lockfile is not workspace-complete. Missing package entries: ${missing.join(', ')}`);
  process.exit(1);
}

const rootDependencies = root?.dependencies ?? {};
const forbidden = ['better-sqlite3', 'sqlite3', 'sqlite'];
const forbiddenPresent = forbidden.filter((name) => Object.prototype.hasOwnProperty.call(rootDependencies, name));
if (forbiddenPresent.length) {
  console.error(`Unsupported persistence dependencies remain in lockfile root: ${forbiddenPresent.join(', ')}`);
  process.exit(1);
}

const staleEntries = Object.keys(lock.packages ?? {}).filter((key) => /node_modules\/(better-sqlite3|sqlite3)$/.test(key));
if (staleEntries.length) {
  console.error(`SQLite native dependency entries remain in package-lock.json: ${staleEntries.join(', ')}`);
  process.exit(1);
}

console.log(`Dependency integrity passed: lockfile v${lock.lockfileVersion}, workspaces=${workspaces.join(', ')}, sqlite-free=true`);
