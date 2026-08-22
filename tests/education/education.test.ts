// @ts-nocheck
import assert from 'node:assert/strict';
import {educationProfile,studentProgress} from '../../src/education/education-engine.js';
const p=educationProfile({rid:'RID-EDU-1',enrollments:[{institutionId:'IDN.EDU.X'}]}); assert.equal(p.rid,'RID-EDU-1');
assert.equal(studentProgress({completed:8,total:10}).completionRate,0.8);
console.log('PASS: education');
