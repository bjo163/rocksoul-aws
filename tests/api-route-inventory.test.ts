import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const routesDir = path.resolve('apps/api/src/routes');
const routeFiles = fs.readdirSync(routesDir).filter((file) => file.endsWith('.ts')).sort();
const routeDeclaration = /\.add\(\s*(['"])(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)\1\s*,\s*(['"])(\/api\/v1[^'"]+)\3/g;
const source = fs.readdirSync(routesDir).filter((file) => file.endsWith('.ts')).map((file) => fs.readFileSync(path.join(routesDir, file), 'utf8')).join('\n');
const declarations = [...source.matchAll(/\.add\(\s*(['"])(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)\1\s*,\s*(['"])(\/api\/v1[^'"]+)\3/g)].map((match) => `${match[2]} ${match[4]}`);
const required = ['GET /api/v1/health', 'GET /api/v1/ready', 'GET /api/v1/engine/catalog', 'POST /api/v1/auth/login', 'POST /api/v1/auth/refresh', 'POST /api/v1/auth/logout', 'POST /api/v1/command', 'POST /api/v1/query', 'POST /api/v1/analyze', 'POST /api/v1/evaluate', 'POST /api/v1/mizan', 'POST /api/v1/observe', 'GET /api/v1/resource/:id', 'GET /api/v1/resource/:id/evidence', 'POST /api/v1/resource/:id/evidence', 'GET /api/v1/reviews', 'POST /api/v1/reviews', 'POST /api/v1/reviews/:id/transition', 'POST /api/v1/ingress/reminder', 'POST /api/v1/ingress/reminder/trigger', 'POST /api/v1/ai/analyze'];

function operationsIn(file: string): string[] {
  const fileSource = fs.readFileSync(path.join(routesDir, file), 'utf8');
  return [...fileSource.matchAll(routeDeclaration)].map((match) => `${match[2]} ${match[4]}`);
}

const extractedCapabilityRoutes = new Map([
  ['analysis.routes.ts', ['POST /api/v1/analyze']],
  ['observation.routes.ts', ['POST /api/v1/observe']],
  ['evaluation.routes.ts', ['POST /api/v1/evaluate']],
  ['evidence.routes.ts', ['POST /api/v1/resource/:id/evidence']],
  ['review.routes.ts', ['POST /api/v1/reviews']],
]);

const deferredSelectorModules = [
  'observability.routes.ts',
  'jobs.routes.ts',
  'semantic.routes.ts',
  'revelation.routes.ts',
  'workflow.routes.ts',
];

// This is the intentionally deferred boundary after capability extraction.
// Keep the list exact so a new route in v1.routes.ts cannot silently fall back
// into the compatibility adapter without an inventory decision.
const expectedLegacyV1Routes = [
  'GET /api/v1/observability/recent',
  'GET /api/v1/stream',
  'GET /api/v1/metrics',
  'GET /api/v1/semantic/registry',
  'GET /api/v1/revelation/core',
  'GET /api/v1/revelation/geography',
  'GET /api/v1/revelation/asma',
  'GET /api/v1/revelation/divine-ontology',
  'GET /api/v1/revelation/moral-graph',
  'GET /api/v1/revelation/corpora',
  'GET /api/v1/revelation/lifecycle',
  'GET /api/v1/revelation/grammar',
  'GET /api/v1/jobs/:id',
  'POST /api/v1/jobs/process',
  'POST /api/v1/query',
  'GET /api/v1/xrp/workspace',
  'POST /api/v1/xrp/cases',
  'POST /api/v1/xrp/cases/:id/evidence',
  'POST /api/v1/xrp/work-items',
  'POST /api/v1/xrp/cases/:id/request-review',
  'GET /api/v1/flow/workflows',
  'POST /api/v1/flow/workflows',
  'POST /api/v1/flow/workflows/:id/request-review',
  'POST /api/v1/command',
  'GET /api/v1/resource/:id/audit',
  'GET /api/v1/resource/:id/replay',
  'GET /api/v1/resource/:id',
  'GET /api/v1/reviews',
  'POST /api/v1/reviews/:id/transition',
  'GET /api/v1/resource/:id/evidence',
  'POST /api/v1/ingress/reminder',
  'POST /api/v1/ingress/reminder/trigger',
  'POST /api/v1/ai/analyze',
];

// Deliberately small public surface. Every other v1 operation must call an
// authorization helper in its handler (including compatibility/legacy routes).
const publicRoutes = new Set([
  'GET /api/v1/health',
  'GET /api/v1/ready',
  'GET /api/v1/features',
  'GET /api/v1/engine/catalog',
  'GET /api/v1/prophets',
  'POST /api/v1/auth/register',
  'POST /api/v1/auth/setup',
  'POST /api/v1/auth/login',
  'POST /api/v1/auth/refresh',
  'GET /api/v1/revelation/core',
  'GET /api/v1/revelation/geography',
  'GET /api/v1/revelation/asma',
  'GET /api/v1/revelation/divine-ontology',
  'GET /api/v1/revelation/moral-graph',
  'GET /api/v1/revelation/corpora',
  'GET /api/v1/revelation/lifecycle',
  'GET /api/v1/revelation/grammar',
]);

test('every non-public v1 operation declares an authorization boundary', () => {
  const missing: string[] = [];
  for (const file of routeFiles) {
    const source = fs.readFileSync(path.resolve(routesDir, file), 'utf8');
    const matches = [...source.matchAll(routeDeclaration)];
    for (let index = 0; index < matches.length; index += 1) {
      const match = matches[index];
      const operation = `${match[2]} ${match[4]}`;
      const end = matches[index + 1]?.index ?? source.length;
      const handler = source.slice(match.index ?? 0, end);
      if (!publicRoutes.has(operation) && !/requirePermission|requireAuthenticated|requireProductionAudit|legacyAccess/.test(handler)) missing.push(operation);
    }
  }
  assert.deepEqual(missing, [], `unprotected v1 operations: ${missing.join(', ')}`);
});

test('canonical API route inventory is declared in native routers', () => {
  assert.ok(declarations.length >= 50, `route inventory unexpectedly small: ${declarations.length}`);
  for (const route of required) assert.ok(declarations.includes(route), `${route} route missing`);
});

test('capability modules and the legacy v1 adapter have explicit route ownership', () => {
  for (const [file, expected] of extractedCapabilityRoutes) {
    assert.deepEqual(operationsIn(file), expected, `${file} changed without updating capability ownership`);
  }
  assert.deepEqual(operationsIn('v1.routes.ts'), expectedLegacyV1Routes, 'legacy v1 migration boundary changed without an inventory decision');

  const composition = fs.readFileSync(path.join(routesDir, 'index.ts'), 'utf8');
  for (const file of extractedCapabilityRoutes.keys()) {
    const importName = file.replace('.routes.ts', 'Router');
    assert.match(composition, new RegExp(`import \\{ router as ${importName} \\} from './${file.replace('.ts', '.js')}'`), `${file} is not imported by the active composition`);
    assert.match(composition, new RegExp(`\\b${importName}\\b`), `${file} is not mounted by the active composition`);
  }
  assert.match(composition, /apiCapabilityRouter\.use\(legacyV1Router\)/, 'legacy v1 compatibility adapter is no longer explicit');
  for (const file of deferredSelectorModules) {
    const importName = file.replace('.routes.ts', 'Router');
    assert.doesNotMatch(composition, new RegExp(`\\b${importName}\\b`), `${file} is a deferred selector and must not be mounted alongside legacyV1Router`);
  }
});

test('native route inventory contains no duplicate method/path declarations', () => {
  const duplicates = declarations.filter((route, index) => declarations.indexOf(route) !== index);
  assert.deepEqual([...new Set(duplicates)], [], `duplicate routes: ${duplicates.join(', ')}`);
});
test('all declared API routes are versioned', () => assert.ok(declarations.every((route) => route.split(' ')[1]?.startsWith('/api/v1/'))));
