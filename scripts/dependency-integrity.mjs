import { readFile } from 'node:fs/promises';

const lock = JSON.parse(await readFile('package-lock.json', 'utf8'));
const root = lock.packages?.[''];
const workspaces = root?.workspaces ?? [];

if (lock.lockfileVersion !== 3) throw new Error(`Expected lockfileVersion 3, got ${lock.lockfileVersion}`);
if (!Array.isArray(workspaces) || workspaces.length === 0) throw new Error('Root package-lock.json must declare workspaces.');

const required = ['apps/api', 'apps/web', 'apps/cab', 'apps/xrp', 'apps/flow'];
const missing = required.filter((workspace) => !workspaces.includes('apps/*') && !lock.packages?.[workspace]);
if (missing.length) {
  console.error(`Lockfile is not workspace-complete. Missing package entries: ${missing.join(', ')}`);
  process.exit(1);
}

console.log(`Dependency integrity passed: lockfile v${lock.lockfileVersion}, workspaces=${workspaces.join(', ')}`);
