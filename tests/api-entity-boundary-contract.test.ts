import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const api = fs.readFileSync('apps/cab/src/lib/api.ts', 'utf8');
const kernelRoutes = fs.readFileSync('apps/api/src/routes/kernel.routes.ts', 'utf8');
const revelationIndex = fs.readFileSync('packages/revelation/src/index.ts', 'utf8');
const persistenceTypes = fs.readFileSync('packages/persistence/src/types.ts', 'utf8');

for (const contract of ['EntityRecord', 'RelationRecord', 'EventRecord', 'EvidenceRecord']) {
  test(`persistence exposes canonical ${contract}`, () => assert.ok(persistenceTypes.includes(`interface ${contract}`), contract));
}

test('CAB uses existing Entity/graph/resource/review/kernel/Witness surfaces', () => {
  for (const route of [
    '/api/v1/entities',
    '/api/v1/entities/${encodeURIComponent(id)}/graph',
    '/api/v1/resource/${encodeURIComponent(id)}',
    '/api/v1/resource/${encodeURIComponent(id)}/evidence',
    '/api/v1/reviews',
    '/api/v1/kernel/graph',
    '/api/v1/witness/status',
  ]) assert.ok(api.includes(route), route);
  for (const route of [
    "'/api/v1/kernel/graph'",
    "'/api/v1/kernel/graph/integrity'",
    "'/api/v1/kernel/ledger'",
  ]) assert.ok(kernelRoutes.includes(route), route);
  assert.match(api, /kernelGraph:\s*\(\)\s*=>/);
  assert.match(api, /kernelIntegrity:\s*\(\)\s*=>/);
  assert.match(api, /kernelLedger:\s*\(\)\s*=>/);
  assert.match(api, /witnessStatus:\s*\(\)\s*=>/);
});

test('Revelation package remains semantic and does not own HTTP transport', () => {
  assert.ok(revelationIndex.includes("'./revelation-graph.js'") || revelationIndex.includes('"./revelation-graph.js"'));
  assert.doesNotMatch(revelationIndex, /fetch\(|axios|node:http|\/api\/v1\//);
});

test('CAB boundary rejects specialized duplicate graph APIs', () => {
  for (const forbidden of ['/universe', '/revelation-graph', '/evidence-graph']) {
    assert.doesNotMatch(api, new RegExp(forbidden.replace(/[.*+?^${}()|[\\]\\]/g, '\\\\$&')));
  }
});

test('entity boundary remains generic', () => {
  assert.match(persistenceTypes, /interface EntityRecord[\s\S]*?\n\s*id\s*:\s*string;[\s\S]*?\n\s*type\s*:\s*string;/);
  assert.match(persistenceTypes, /interface RelationRecord[\s\S]*?\n\s*fromId\s*:\s*string;[\s\S]*?\n\s*type\s*:\s*string;/);
  assert.match(persistenceTypes, /interface EventRecord[\s\S]*?\n\s*eventId\s*:\s*string;[\s\S]*?\n\s*eventType\s*:\s*string;/);
  assert.match(persistenceTypes, /interface EvidenceRecord[\s\S]*?\n\s*evidenceId\s*:\s*string;[\s\S]*?\n\s*sourceType\s*:\s*string;/);
});

// 4.33.0: self-contained, runtime-aligned boundary contract.
// Keep this assertion suite independent of documentation files and exact merge-ref layout.
