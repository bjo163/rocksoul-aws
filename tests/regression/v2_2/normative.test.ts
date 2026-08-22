// @ts-nocheck
import assert from 'node:assert/strict';
import { createNormativeEvent, classifyNormative, PERSPECTIVES } from '../../../src/normative/index.js';

const event = createNormativeEvent({type:'SMOKING', jurisdiction:'IDN', context:{publicPlace:true}, evidence:[{id:'E1'}]});
assert.equal(event.type, 'SMOKING');
assert.deepEqual(Object.keys(PERSPECTIVES), ['R','G','B','L']);

const result = classifyNormative(event, {
  sources:[
    {sourceId:'QURAN/EXAMPLE',authorityClass:'REVELATION',domain:'RELIGIOUS',priority:10,confidence:0.9},
    {sourceId:'IDN/EXAMPLE',authorityClass:'STATUTE',domain:'CIVIC',priority:20,confidence:0.95}
  ],
  rules:[
    {ruleId:'REL-1',type:'SMOKING',jurisdiction:'IDN',priority:10,source:{sourceId:'QURAN/EXAMPLE',authorityClass:'REVELATION'}},
    {ruleId:'CIV-1',type:'SMOKING',jurisdiction:'IDN',priority:20,source:{sourceId:'IDN/EXAMPLE',authorityClass:'STATUTE'}}
  ],
  rights:['PUBLIC_HEALTH'],
  harms:['SECONDHAND_SMOKE'],
  remedies:[{type:'PROTECT'}]
});
assert.equal(result.matchedRules.length, 2);
assert.ok(result.perspectives.R);
assert.ok(result.perspectives.G.sources.length >= 1);
assert.equal(result.perspectives.B.rights[0], 'PUBLIC_HEALTH');
assert.equal(result.perspectives.L.restorative, true);
assert.equal(result.modelOnly, true);
console.log('PASS: unified normative multi-perspective tests');
