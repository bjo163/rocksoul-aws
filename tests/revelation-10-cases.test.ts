import assert from 'node:assert/strict';
import { runRevelationTenCaseSmoke } from '../src/revelation/verification/ten-case.js';

const result=await runRevelationTenCaseSmoke(process.cwd());
assert.equal(result.ok,true);
assert.equal(result.summary.passed,10);
assert.equal(result.summary.total,10);
const smoking=result.cases.find(row=>row.id==='RC08');
assert.equal(smoking?.direction,'UNRESOLVED');
assert.equal(smoking?.revelationAlignmentScore,null);
assert.equal(smoking?.analyticalScore,null);
assert.equal(result.summary.pureRevelationDerived,9);
console.log(JSON.stringify(result,null,2));
