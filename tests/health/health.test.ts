// @ts-nocheck
import assert from 'node:assert/strict';
import {healthProfile} from '../../src/health/health-engine.js';
import {toSatusehatResource} from '../../src/health/satusehat-adapter.js';
const p=healthProfile({rid:'RID-HEALTH-1',conditions:['Z00']});
assert.equal(p.standard,'HL7_FHIR');
const f=toSatusehatResource({rid:p.rid,patientId:'PAT-1'}); assert.equal(f.resourceType,'Patient');
console.log('PASS: health');
