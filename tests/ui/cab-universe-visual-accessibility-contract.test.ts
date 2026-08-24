import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

const drilldown = fs.readFileSync('apps/cab/src/components/UniverseDrilldown.tsx', 'utf8');
const observatory = fs.readFileSync('apps/cab/src/components/Observatory.tsx', 'utf8');
const en = JSON.parse(fs.readFileSync('apps/cab/src/locales/universe-en.json', 'utf8'));
const id = JSON.parse(fs.readFileSync('apps/cab/src/locales/universe-id.json', 'utf8'));

const requiredKeys = ['eventToPassage','propheticEvents','openEvent','prophetProfile','profilesTitle','profileDetail','eventDetail','governanceRail','reviewWitnessAudit'];

test('CAB Universe drilldown is keyboard-addressable and localized', () => {
  assert.match(drilldown, /aria-pressed=/);
  assert.match(drilldown, /aria-label=/);
  assert.match(drilldown, /role="list"/);
  assert.match(drilldown, /useTranslation\(locale\)/);
  assert.match(drilldown, /universeEn/);
  assert.match(drilldown, /universeId/);

  for (const key of requiredKeys) {
    assert.equal(typeof en[key], 'string', `missing EN key: ${key}`);
    assert.equal(typeof id[key], 'string', `missing ID key: ${key}`);
  }

  assert.doesNotMatch(drilldown, />Prophetic Events</);
  assert.doesNotMatch(drilldown, />Open event</);
  assert.doesNotMatch(drilldown, />Review · Witness · Audit</);
});

test('Observatory passes locale into the Universe projection surface', () => {
  assert.match(observatory, /UniverseDrilldown[\s\S]*locale=\{locale\}/);
});
