import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const canonical = (value) => value === null || typeof value !== 'object' ? JSON.stringify(value) : Array.isArray(value) ? `[${value.map(canonical).join(',')}]` : `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
const hashFile = (file) => sha256(fs.readFileSync(path.join(root, file)));
const gitSha = () => { const result = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8', shell: false }); if (result.status !== 0) throw new Error('RELEASE_PROVENANCE_GIT_SHA_UNAVAILABLE'); return result.stdout.trim(); };
const args = process.argv.slice(2); const valueFor = (flag) => args.includes(flag) ? args[args.indexOf(flag) + 1] : undefined;

function build() {
  const rootPackage = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const lock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'));
  const files = ['package.json', 'package-lock.json', ...fs.readdirSync(path.join(root, 'packages'), { withFileTypes: true }).filter(entry => entry.isDirectory() && fs.existsSync(path.join(root, 'packages', entry.name, 'package.json'))).map(entry => `packages/${entry.name}/package.json`)].sort();
  const artifacts = files.map(file => ({ path: file, sha256: hashFile(file) }));
  const components = Object.entries(lock.packages ?? {}).filter(([name]) => name).map(([name, pkg]) => ({ name, version: pkg.version ?? null, resolved: pkg.resolved ?? null, integrity: pkg.integrity ?? null })).sort((a, b) => a.name.localeCompare(b.name));
  const payload = { protocol: 'COSMIC_RELEASE_PROVENANCE_V1', release: { version: rootPackage.version, gitSha: gitSha() }, sbom: { format: 'npm-package-lock-v3', components }, artifacts };
  return { ...payload, integrity: { algorithm: 'SHA-256', canonicalization: 'SORTED_JSON_V1', payloadSha256: sha256(canonical(payload)) } };
}
function verify(manifest) { const { integrity, ...payload } = manifest ?? {}; return integrity?.algorithm === 'SHA-256' && integrity?.payloadSha256 === sha256(canonical(payload)); }

const verifyPath = valueFor('--verify');
if (verifyPath) {
  const manifest = JSON.parse(fs.readFileSync(path.resolve(root, verifyPath), 'utf8'));
  if (!verify(manifest)) { console.error('RELEASE_PROVENANCE_INVALID'); process.exit(1); }
  console.log('RELEASE_PROVENANCE_VALID');
} else {
  const manifest = build(); const output = valueFor('--output');
  const encoded = `${JSON.stringify(manifest, null, 2)}\n`;
  if (output) { const target = path.resolve(root, output); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, encoded); } else process.stdout.write(encoded);
}
