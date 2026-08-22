import assert from 'node:assert/strict';
import test from 'node:test';
import { runMoralLifecycleAdversarialSuite } from '../src/events/verification/lifecycle-adversarial.js';

test('v4.28 moral lifecycle adversarial matrix passes 100/100 without computing divine acceptance', async()=>{
  const report=await runMoralLifecycleAdversarialSuite(process.cwd());
  assert.equal(report.ok,true,JSON.stringify(report.failures,null,2));
  assert.equal(report.summary.passed,100);
  assert.equal(report.summary.total,100);
});
