import { readdir, readFile } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';

const roots = ['src', 'apps', 'packages'];
const sourceExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
const packageHostImportPatterns = [
  /(?:^|[\\/])apps[\\/]api(?:[\\/]|$)/,
  /(?:^|[\\/])src[\\/](?:api|routes|server|app)(?:[\\/]|$)/,
  /^(?:express|fastify|hono)(?:\/|$)/,
];
// The API is the temporary compatibility adapter for the legacy root runtime.
// Keep this list explicit so new root-src dependencies fail architecture CI and
// can be migrated deliberately into packages instead of growing silently.
const apiRootSrcAllowlist = new Set([
  'access/auth.js', 'access/feature-registry.js', 'access/postgres-auth.js',
  'ai/general-analyzer.js', 'ai/provider.js', 'audit/event-replay.js',
  'config-loader.js', 'contracts/mizan.js', 'ingress/divine-ingress.js',
  'ingress/revelation-reminder-engine.js', 'ledger/distributed-witness.js',
  'ledger/witness-mizan.js', 'observability/observability.js',
  'revelation/asma/asma-engine.js', 'revelation/asma/divine-ontology.js',
  'revelation/corpus/four-book-corpus.js', 'revelation/grammar/revelation-grammar.js',
  'revelation/lifecycle/revelation-lifecycle.js', 'revelation/moral-graph/revelation-moral-graph.js',
  'revelation/revelation-geography.js', 'revelation/revelation-semantic-core.js',
  'review/workflow.js', 'security/authorization.js',
]);
const violations = [];
const apiRootSrcImports = new Set();

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
      for (const specifier of imports) {
        if (specifier.startsWith('apps/') || specifier.startsWith('packages/')) {
          violations.push(`${path}: cross-workspace absolute import ${specifier}`);
        }
        if (specifier.includes('/apps/')) {
          violations.push(`${path}: cross-app import ${specifier}`);
        }
        const normalizedPath = path.replaceAll('\\', '/');
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
