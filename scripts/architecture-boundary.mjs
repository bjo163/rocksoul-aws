import { readdir, readFile } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';

const roots = ['src', 'apps', 'packages'];
const sourceExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
const packageHostImportPatterns = [
  /(?:^|[\\/])apps[\\/]api(?:[\\/]|$)/,
  /(?:^|[\\/])src[\\/](?:api|routes|server|app)(?:[\\/]|$)/,
  /^(?:express|fastify|hono)(?:\/|$)/,
];
const packageNames = new Set();
const packageDirs = new Map();
// The API is the temporary compatibility adapter for the legacy root runtime.
// Keep this list explicit so new root-src dependencies fail architecture CI and
// can be migrated deliberately into packages instead of growing silently.
const apiRootSrcAllowlist = new Set([
  'access/auth.js', 'access/feature-registry.js', 'access/postgres-auth.js',
  'ai/general-analyzer.js', 'ai/provider.js', 'audit/event-replay.js',
  'config-loader.js', 'contracts/mizan.js', 'ingress/divine-ingress.js',
  'ingress/revelation-reminder-engine.js', 'ledger/distributed-witness.js',
  'ledger/witness-mizan.js', 'observability/observability.js',
  'review/workflow.js', 'security/authorization.js',
]);
const violations = [];
const apiRootSrcImports = new Set();

const packageGraph = new Map();
for (const entry of await readdir('packages', { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  try {
    const manifest = JSON.parse(await readFile(join('packages', entry.name, 'package.json'), 'utf8'));
    const deps = { ...(manifest.dependencies ?? {}), ...(manifest.peerDependencies ?? {}) };
    packageGraph.set(`@moonwitness/${entry.name}`, Object.keys(deps).filter((name) => name.startsWith('@moonwitness/')));
  } catch {}
}
const visiting = new Set();
const visited = new Set();
function findCycles(node, path = []) {
  if (visiting.has(node)) {
    const start = path.indexOf(node);
    violations.push(`circular workspace dependency: ${[...path.slice(start), node].join(' -> ')}`);
    return;
  }
  if (visited.has(node)) return;
  visiting.add(node);
  for (const dependency of packageGraph.get(node) ?? []) findCycles(dependency, [...path, node]);
  visiting.delete(node);
  visited.add(node);
}
for (const packageName of packageGraph.keys()) findCycles(packageName);

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
      const normalizedPath = path.replaceAll('\\', '/');
      for (const specifier of imports) {
        if (specifier.startsWith('apps/') || specifier.startsWith('packages/')) {
          violations.push(`${path}: cross-workspace absolute import ${specifier}`);
        }
        if (normalizedPath.startsWith('packages/')) {
          const packageName = normalizedPath.split('/')[1];
          const workspaceMatch = specifier.match(/^@moonwitness\/([^/]+)(?:\/|$)/);
          if (workspaceMatch && workspaceMatch[1] === packageName) {
            violations.push(`${path}: package self-imports through workspace name ${specifier}`);
          }
          if (workspaceMatch && specifier.includes('/src/')) {
            violations.push(`${path}: package deep-imports another package source ${specifier}`);
          }
        }
        if (specifier.includes('/apps/')) {
          violations.push(`${path}: cross-app import ${specifier}`);
        }
        if (normalizedPath.startsWith('packages/') && packageHostImportPatterns.some((pattern) => pattern.test(specifier))) {
          violations.push(`${path}: package imports host-specific module ${specifier}`);
        }
        const resolved = resolve(dirname(path), specifier);
        const rootSrc = resolve('src');
        if (normalizedPath.startsWith('packages/') && (specifier === 'src' || specifier.startsWith('src/') || resolved === rootSrc || resolved.startsWith(`${rootSrc}${sep}`))) {
          violations.push(`${path}: package imports root src module ${specifier}`);
        }
        if (normalizedPath.startsWith('apps/api/src/') && (resolved === rootSrc || resolved.startsWith(`${rootSrc}${sep}`))) {
          const relativeRoot = relative(rootSrc, resolved).replaceAll('\\', '/');
          const extensionless = relativeRoot.replace(/\.tsx?$/, '.js');
          apiRootSrcImports.add(extensionless);
          if (!apiRootSrcAllowlist.has(extensionless)) {
            violations.push(`${path}: API root-src import is not allowlisted ${extensionless}`);
          }
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
console.log(`API legacy root-src imports: ${apiRootSrcImports.size} (allowlisted ${apiRootSrcAllowlist.size}).`);
