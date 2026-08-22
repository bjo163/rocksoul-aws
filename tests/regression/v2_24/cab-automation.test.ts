// @ts-nocheck
import test from 'node:test'; import assert from 'node:assert/strict'; import {suggestCabAction} from '../../../src/personal/cab-automation/index.js';
test('v2.24 CAB automation requires review',()=>{const x=suggestCabAction('improve verification',{affectedTypes:['KNOWLEDGE.CLAIM'],risk:'MEDIUM'});assert.equal(x.next,'CAB_REVIEW');assert.equal(x.changeRequest.requiresReview,true)});
