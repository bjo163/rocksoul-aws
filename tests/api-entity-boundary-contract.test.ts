import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const entityRoutes = fs.readFileSync('apps/api/src/routes/entities.routes.ts', 'utf8');
const v1Routes = fs.readFileSync('apps/api/src/routes/v1.routes.ts', 'utf8');
const kernelRoutes = fs.readFileSync('apps/api/src/routes/kernel.routes.ts', 'utf8');
const witnessRoutes = fs.readFileSync('apps/api/src/routes/witness.routes.ts', 'utf8');
const revelationIndex = fs.readFileSync('packages/revelation/src/index.ts', 'utf8');
const persistenceTypes = fs.readFileSync('packages/persistence/src/types.ts', 'utf8');

for (const contract of ['EntityRecord', 'RelationRecord', 'EventRecord', 'EvidenceRecord']) {
  test(`persistence exposes canonical ${contract}`, () => assert.ok(persistenceTypes.includes(`interface ${contract}`), contract));
}

test('reference API exposes canonical generic graph, resource, review, kernel, and Witness surfaces', () => {
  for (const route of ["'/api/v1/entities'", "'/api/v1/entities/:id/graph'"]) assert.ok(entityRoutes.includes(route), route);
  for (const route of ["'/api/v1/resource/:id'", "'/api/v1/resource/:id/evidence'", "'/api/v1/reviews'"]) assert.ok(v1Routes.includes(route), route);
  for (const route of ["'/api/v1/kernel/graph'", "'/api/v1/kernel/graph/integrity'", "'/api/v1/kernel/ledger'"]) assert.ok(kernelRoutes.includes(route), route);
  assert.ok(witnessRoutes.includes("'/api/v1/witness/status'"), '/api/v1/witness/status');
});

test('Revelation package remains semantic and does not own HTTP transport', () => {
  assert.ok(revelationIndex.includes("'./revelation-graph.js'") || revelationIndex.includes('"./revelation-graph.js"'));
  assert.doesNotMatch(revelationIndex, /fetch\(|axios|node:http|\/api\/v1\//);
});

test('engine/API boundary rejects specialized duplicate graph APIs', () => {
  const apiSurface = `${entityRoutes}\n${v1Routes}\n${kernelRoutes}`;
  for (const forbidden of ['/universe', '/revelation-graph', '/evidence-graph']) assert.ok(!apiSurface.includes(forbidden), forbidden);
});

test('entity boundary remains generic', () => {
  assert.match(persistenceTypes, /interface EntityRecord[\s\S]*?\n\s*id\s*:\s*string;[\s\S]*?\n\s*type\s*:\s*string;/);
  assert.match(persistenceTypes, /interface RelationRecord[\s\S]*?\n\s*fromId\s*:\s*string;[\s\S]*?\n\s*type\s*:\s*string;/);
  assert.match(persistenceTypes, /interface EventRecord[\s\S]*?\n\s*eventId\s*:\s*string;[\s\S]*?\n\s*eventType\s*:\s*string;/);
  assert.match(persistenceTypes, /interface EvidenceRecord[\s\S]*?\n\s*evidenceId\s*:\s*string;[\s\S]*?\n\s*sourceType\s*:\s*string;/);
});
