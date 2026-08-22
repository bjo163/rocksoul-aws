import assert from 'node:assert/strict';
import { getCharter, validateCharter } from '../../src/governance/constitutional-engine.js';
import { createPublicProject, createDecision } from '../../src/governance/open-government.js';

const c = getCharter();
assert.equal(c.articles.length,47);
assert.equal(validateCharter(c).valid,true);
const p = createPublicProject({projectId:'P-1',title:'Bridge',ownerOffice:'OFFICE-INFRA'});
assert.equal(p.visibility,'PUBLIC_BY_DEFAULT');
const d = createDecision({decisionId:'D-1',proposer:'OFFICE-HEAD-001'});
assert.equal(d.published,false);
console.log('PASS: governance tests');
