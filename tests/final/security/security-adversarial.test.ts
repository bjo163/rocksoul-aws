// @ts-nocheck
import test from 'node:test';
import assert from 'node:assert/strict';
import { authorize, classifyData, privacyPolicy } from '../../../src/security/security.js';
import { visibilityFor } from '../../../src/security/privacy.js';

test('inactive actor denied', () => assert.equal(authorize({user:{active:false,roles:['ADMIN']}}).allowed,false));
test('role escalation denied', () => assert.equal(authorize({user:{active:true,roles:['USER']},requiredRoles:['ADMIN']}).allowed,false));
test('permission escalation denied', () => assert.equal(authorize({user:{active:true,roles:['USER'],permissions:[]},requiredPermission:'write'}).allowed,false));
test('secret requires admin', () => assert.equal(authorize({user:{active:true,roles:['USER']},resourceClass:'SECRET'}).allowed,false));
test('admin can access secret', () => assert.equal(authorize({user:{active:true,roles:['ADMIN']},resourceClass:'SECRET'}).allowed,true));
test('public privacy is publishable', () => assert.equal(privacyPolicy({resourceClass:'PUBLIC'}).publishable,true));
test('personal requires consent', () => { const p=privacyPolicy({resourceClass:'PERSONAL'}); assert.equal(p.consentRequired,true); assert.equal(p.consentSatisfied,false); });
test('owner self-access allowed', () => assert.equal(visibilityFor({dataClass:'PERSONAL',ownerRid:'RID-1'},'SELF',{rid:'RID-1'}).allowed,true));
test('other user personal data denied', () => assert.equal(visibilityFor({dataClass:'PERSONAL',ownerRid:'RID-1'},'SELF',{rid:'RID-2'}).allowed,false));
test('privacy officer can access personal', () => assert.equal(visibilityFor({dataClass:'PERSONAL',ownerRid:'RID-1'},'ANY',{rid:'RID-2',roles:['PRIVACY_OFFICER']}).allowed,true));
test('classification is deterministic', () => { assert.equal(classifyData({secret:true}),'SECRET'); assert.equal(classifyData({restricted:true}),'RESTRICTED'); assert.equal(classifyData({sensitive:true}),'SENSITIVE'); assert.equal(classifyData({containsPersonal:true}),'PERSONAL'); assert.equal(classifyData({}),'PUBLIC'); });
