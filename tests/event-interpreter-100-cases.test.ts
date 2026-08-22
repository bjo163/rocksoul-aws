import assert from 'node:assert/strict';
import {runEventAdversarialSuite} from '../src/events/verification/adversarial.js';
const result=await runEventAdversarialSuite(process.cwd());
if(!result.ok) console.error(JSON.stringify(result.failures,null,2));
assert.equal(result.ok,true);
assert.equal(result.summary.passed,100);
assert.equal(result.summary.total,100);
console.log(JSON.stringify(result.summary,null,2));
