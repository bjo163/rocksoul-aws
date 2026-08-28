import { existsSync, readFileSync } from 'node:fs';

const removedProductApps = ['apps/web', 'apps/cab', 'apps/xrp', 'apps/flow'];
const failures = [];

for (const app of removedProductApps) {
  if (existsSync(app)) failures.push(`product UI application must live outside Cosmic: ${app}`);
}

if (!existsSync('apps/api')) failures.push('reference host adapter missing: apps/api');

const forbiddenPath = /apps\/(?:web|cab|xrp|flow)(?:\/|['"`])/i;
for (const file of [
  '.github/workflows/certification.yml',
  'tests/api-entity-boundary-contract.test.ts',
  'tests/release/persistence/index.test.ts',
]) {
  const text = readFileSync(file, 'utf8');
  if (forbiddenPath.test(text)) failures.push(`${file}: mandatory release surface references a removed product app`);
}

const checklist = readFileSync('docs/RELEASE_CHECKLIST.md', 'utf8');
if (/CAB build|Web build|XRP build|Flow build/i.test(checklist)) {
  failures.push('docs/RELEASE_CHECKLIST.md: product UI build is still a mandatory release gate');
}

const todo = readFileSync('docs/TODO_CURRENT.md', 'utf8');
if (/N5-WEB|Automatic CI is intentionally disabled on `dev`/i.test(todo)) {
  failures.push('docs/TODO_CURRENT.md: stale UI/CI execution contract remains active');
}

const workflow = readFileSync('.github/workflows/certification.yml', 'utf8');
if (!workflow.includes('branches: [main, dev]')) failures.push('certification workflow must run on pushes to main and dev');
if (!/pull_request:\s*\n\s*branches:\s*\[main\]/m.test(workflow)) failures.push('certification workflow must gate pull requests targeting main');

if (failures.length) {
  console.error('Engine-only release scope violations:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Engine-only release scope check passed.');
