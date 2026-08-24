import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const observatory = fs.readFileSync('apps/cab/src/components/Observatory.tsx', 'utf8');
const drilldown = fs.readFileSync('apps/cab/src/components/UniverseDrilldown.tsx', 'utf8');
const api = fs.readFileSync('apps/cab/src/lib/api.ts', 'utf8');

test('CAB Observatory exposes Event to Passage drilldown', () => {
  for (const token of ['EVENT → PASSAGE', 'quranReferences', 'PASSAGE REFERENCE', 'UNRESOLVED REFERENCE', 'KNOWLEDGE.PROPHETIC_EVENT']) assert.ok(drilldown.includes(token), token);
});

test('CAB Observatory exposes Prophet profile drilldown without inventing relations', () => {
  for (const token of ['PROPHET PROFILE', 'Scripture-Grounded Profiles', 'missionTags', 'prophetEvents']) assert.ok(drilldown.includes(token), token);
  assert.ok(drilldown.includes("api.entities('REVELATION.PROPHET_PROFILE')") || observatory.includes("api.entities('REVELATION.PROPHET_PROFILE')"));
});

test('CAB Observatory exposes Review Witness Audit governance rail', () => {
  for (const token of ['GOVERNANCE RAIL', 'Review · Witness · Audit', 'api.reviews()', 'api.witnessStatus()', 'AuditTimeline', 'WitnessPanel']) assert.ok(drilldown.includes(token) || api.includes(token), token);
  assert.ok(!drilldown.includes('/api/v1/universe'));
  assert.ok(!drilldown.includes('/api/v1/revelation-graph'));
});
