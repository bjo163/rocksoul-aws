import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const observatory = fs.readFileSync('apps/cab/src/components/Observatory.tsx', 'utf8');
const base = fs.readFileSync('apps/cab/src/components/ObservatoryBase.tsx', 'utf8');
const drilldown = fs.readFileSync('apps/cab/src/components/UniverseDrilldown.tsx', 'utf8');
const api = fs.readFileSync('apps/cab/src/lib/api.ts', 'utf8');

test('CAB observatory composes the operational base and Universe drilldown surfaces', () => {
  for (const token of ['ObservatoryBase', 'UniverseDrilldown', 'locale={locale}']) assert.ok(observatory.includes(token), token);
  for (const token of ['Universe Observatory', 'Universe Graph', 'Evidence & Provenance', 'WorldStateSnapshot', 'AuditTimeline']) assert.ok(base.includes(token), token);
  for (const token of ['Scripture-Grounded Profiles', 'GOVERNANCE RAIL', 'Review · Witness · Audit']) assert.ok(drilldown.includes(token), token);
});

test('CAB observatory uses existing entity and graph surfaces without a new API family', () => {
  for (const token of ['api.kernelGraph()', "api.entities('REVELATION.PROPHET_PROFILE')", "api.entities('KNOWLEDGE.PROPHETIC_EVENT')", "api.entities('KNOWLEDGE.EVIDENCE')"]) {
    assert.ok(base.includes(token) || observatory.includes(token), token);
  }
  assert.doesNotMatch(api, /\/api\/v1\/universe|\/api\/v1\/revelation-graph|\/api\/v1\/evidence-graph/);
});

test('CAB observatory preserves epistemic lanes in the rendered universe surface', () => {
  for (const lane of ['CORE', 'DERIVED', 'UNRESOLVED']) assert.ok(base.includes(lane) || drilldown.includes(lane), lane);
});
