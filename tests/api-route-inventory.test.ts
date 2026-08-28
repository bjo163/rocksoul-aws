import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const routesDir = path.resolve('apps/api/src/routes');
const source = fs.readdirSync(routesDir).filter((file) => file.endsWith('.ts')).map((file) => fs.readFileSync(path.join(routesDir, file), 'utf8')).join('\n');
const declarations = [...source.matchAll(/\.add\(\s*(['"])(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)\1\s*,\s*(['"])(\/api\/v1[^'"]+)\3/g)].map((match) => `${match[2]} ${match[4]}`);
const required = ['GET /api/v1/health', 'GET /api/v1/ready', 'POST /api/v1/auth/login', 'POST /api/v1/auth/refresh', 'POST /api/v1/auth/logout', 'POST /api/v1/command', 'POST /api/v1/query', 'POST /api/v1/analyze', 'POST /api/v1/evaluate', 'POST /api/v1/mizan', 'POST /api/v1/observe', 'GET /api/v1/resource/:id', 'GET /api/v1/resource/:id/evidence', 'POST /api/v1/resource/:id/evidence', 'GET /api/v1/reviews', 'POST /api/v1/reviews', 'POST /api/v1/reviews/:id/transition', 'POST /api/v1/ingress/reminder', 'POST /api/v1/ingress/reminder/trigger', 'POST /api/v1/ai/analyze'];

test('canonical API route inventory is declared in native routers', () => {
  assert.ok(declarations.length >= 50, `route inventory unexpectedly small: ${declarations.length}`);
  for (const route of required) assert.ok(declarations.includes(route), `${route} route missing`);
});
test('native route inventory contains no duplicate method/path declarations', () => {
  const duplicates = declarations.filter((route, index) => declarations.indexOf(route) !== index);
  assert.deepEqual([...new Set(duplicates)], [], `duplicate routes: ${duplicates.join(', ')}`);
});
test('all declared API routes are versioned', () => assert.ok(declarations.every((route) => route.split(' ')[1]?.startsWith('/api/v1/'))));
