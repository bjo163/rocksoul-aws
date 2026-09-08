import { existsSync, readFileSync } from 'node:fs';

const removedLegacyProductApps = ['apps/cab', 'apps/xrp', 'apps/flow'];
const failures = [];

for (const app of removedLegacyProductApps) {
  if (existsSync(app)) failures.push(`legacy product UI application must live outside AWS/Cosmic: ${app}`);
}

// apps/web is permitted only as a bounded AWS LAW-domain explorer. It is not the
// ecosystem-wide PUBLIC owner; that responsibility remains rocksoul-web.
if (existsSync('apps/web')) {
  const webPackage = JSON.parse(readFileSync('apps/web/package.json', 'utf8'));
  const webSource = readFileSync('apps/web/src/main.tsx', 'utf8');
  if (webPackage.name !== '@moonwitness/aws-web') failures.push('apps/web must retain the bounded @moonwitness/aws-web identity');
  if (!/LAW|legal/i.test(webSource)) failures.push('apps/web must present AWS LAW/legal-domain material');
  if (/canonical owner of (?:STORY|EVENT|PERSON|TEXT|PERSPECTIVE|RELATIONSHIP)/i.test(webSource)) {
    failures.push('apps/web must not claim another research domain');
  }
}

if (!existsSync('apps/api')) failures.push('reference host adapter missing: apps/api');

const forbiddenPath = /apps\/(?:cab|xrp|flow)(?:\/|['"`])/i;
for (const file of [
  '.github/workflows/certification.yml',
  'tests/api-entity-boundary-contract.test.ts',
  'tests/release/persistence/index.test.ts',
]) {
  const text = readFileSync(file, 'utf8');
  if (forbiddenPath.test(text)) failures.push(`${file}: mandatory release surface references a removed legacy product app`);
}

const checklist = readFileSync('docs/RELEASE_CHECKLIST.md', 'utf8');
if (/CAB build|XRP build|Flow build/i.test(checklist)) {
  failures.push('docs/RELEASE_CHECKLIST.md: legacy product UI build is still a mandatory release gate');
}

const todo = readFileSync('docs/TODO_CURRENT.md', 'utf8');
if (/N5-WEB|Automatic CI is intentionally disabled on `dev`/i.test(todo)) {
  failures.push('docs/TODO_CURRENT.md: stale UI/CI execution contract remains active');
}

const workflow = readFileSync('.github/workflows/certification.yml', 'utf8');
if (!workflow.includes('branches: [main, dev]')) failures.push('certification workflow must run on pushes to main and dev');
if (!/pull_request:\s*\n\s*branches:\s*\[main\]/m.test(workflow)) failures.push('certification workflow must gate pull requests targeting main');

if (failures.length) {
  console.error('AWS release-scope violations:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('AWS release scope check passed: legacy Cosmic product apps absent; optional LAW explorer bounded to AWS.');
