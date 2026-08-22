import fs from 'node:fs';
import path from 'node:path';

// transpile-exec runs from an isolated repository-shaped temporary root.
// Using cwd keeps this check valid both there and from the real checkout.
const root = path.resolve(process.env.MW_REPO_ROOT ?? process.cwd());
const readJson = (file: string) => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8')) as Record<string, unknown>;
const rootPackage = readJson('package.json');
const expected = rootPackage.version;
if (typeof expected !== 'string' || !/^\d+\.\d+\.\d+$/.test(expected)) throw new Error('RELEASE_VERSION_INVALID');

const packageFiles = ['apps/api/package.json', 'apps/cab/package.json', 'apps/web/package.json', 'apps/xrp/package.json', 'apps/flow/package.json', 'packages/contracts/package.json', 'packages/data-access/package.json', 'packages/persistence/package.json', 'packages/sdk/package.json', 'packages/ui/package.json'];
const packages = packageFiles.map((file) => ({ file, version: readJson(file).version }));
const mismatched = packages.filter((item) => item.version !== expected);
if (mismatched.length) throw new Error(`RELEASE_PACKAGE_VERSION_MISMATCH:${JSON.stringify({ expected, mismatched })}`);

const docs = ['docs/README.md', 'docs/FINAL_STATUS.md', `docs/RELEASE_NOTES_${expected}.md`, `docs/TEST_REPORT_${expected}.md`];
const missing = docs.filter((file) => !fs.existsSync(path.join(root, file)));
if (missing.length) throw new Error(`RELEASE_DOCUMENT_MISSING:${missing.join(',')}`);
const stale = docs.filter((file) => !fs.readFileSync(path.join(root, file), 'utf8').includes(expected));
if (stale.length) throw new Error(`RELEASE_DOCUMENT_VERSION_MISSING:${stale.join(',')}`);

console.log(JSON.stringify({ status: 'PASS', releaseVersion: expected, packages: packages.length, documents: docs.length }, null, 2));
