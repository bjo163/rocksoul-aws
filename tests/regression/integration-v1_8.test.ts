// @ts-nocheck
import assert from 'node:assert/strict';
import {IntegrationKernel} from '../../src/core/integration-kernel.js';
import {indonesiaScope} from '../../src/regional/indonesia/profile.js';
import {healthProfile} from '../../src/health/health-engine.js';
import {educationProfile} from '../../src/education/education-engine.js';
import {resourceState} from '../../src/resources/national-resource-engine.js';
import {createIncident} from '../../src/disaster/disaster-engine.js';
const k=new IntegrationKernel(); k.register('health',{evaluate:healthProfile}); k.register('education',{evaluate:educationProfile});
assert.equal(indonesiaScope().countryCode,'ID'); assert.equal(k.health().ok,true);
assert.equal(resourceState({resourceId:'R1',type:'WATER',regionCode:'IDN'}).type,'WATER');
assert.equal(createIncident({incidentId:'D1',type:'FLOOD',regionCode:'IDN.ID.JBR'}).status,'DETECTED');
console.log('PASS: v1.8 integration');
