// @ts-nocheck
import assert from 'node:assert/strict';
import test from 'node:test';
import {authorize,classifyData,privacyPolicy} from '../../../src/security/security.js';

test('v2.17 authorization and privacy',()=>{
  assert.equal(authorize({user:{active:true,roles:['USER']},requiredRoles:['ADMIN']}).allowed,false);
  assert.equal(authorize({user:{active:true,roles:['ADMIN']},resourceClass:'SECRET'}).allowed,true);
  assert.equal(classifyData({containsPersonal:true}),'PERSONAL');
  assert.equal(privacyPolicy({resourceClass:'PERSONAL'}).publishable,false);
});
