// @ts-nocheck
import assert from 'node:assert/strict';
import { detectConflicts, resolveConflicts, authorityScore, CONFLICT_STATUS } from '../../../src/conflict/rule-conflict.js';
import { confidenceScore, confidenceBand } from '../../../src/conflict/confidence.js';

const a={ruleId:'R1',key:'SMOKING',jurisdiction:'ID',authorityClass:'REGULATION',priority:10,effect:{status:'PROHIBITED'}};
const b={ruleId:'R2',key:'SMOKING',jurisdiction:'ID',authorityClass:'STATUTE',priority:20,effect:{status:'RESTRICTED'}};
const none=detectConflicts([a]); assert.equal(none.status,CONFLICT_STATUS.NONE);
const conflict=detectConflicts([a,b]); assert.equal(conflict.status,CONFLICT_STATUS.ACTUAL);
const resolved=resolveConflicts([a,b],{jurisdiction:'ID'}); assert.equal(resolved.selected.ruleId,'R2');
assert.ok(authorityScore(b)>authorityScore(a));
const equalA={...a,priority:10,authorityClass:'STATUTE'}; const equalB={...b,priority:10,authorityClass:'STATUTE'};
assert.equal(resolveConflicts([equalA,equalB],{jurisdiction:'ID'}).status,CONFLICT_STATUS.UNRESOLVED);
const c=confidenceScore({evidence:1,rule:1,semantic:1,context:1,sourceAuthority:1}); assert.equal(c,1); assert.equal(confidenceBand(c),'HIGH');
console.log('PASS: rule conflict, authority, jurisdiction, and confidence');
