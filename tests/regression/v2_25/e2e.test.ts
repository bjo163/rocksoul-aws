// @ts-nocheck
import test from 'node:test'; import assert from 'node:assert/strict'; import {buildPersonalLifecycle} from '../../../src/personal/e2e/index.js';
test('v2.25 personal lifecycle complete',()=>{const steps=['IDENTITY','RELATION','HEALTH','EDUCATION','EMPLOYMENT','INCOME','WEALTH','ASSET','TAX','ZAKAT','KNOWLEDGE','CAB','VERIFICATION','SHADOW','SCENARIO','PROJECT','EVENT','ASMA','MIZAN','XP','AUDIT'].map(type=>({type}));const x=buildPersonalLifecycle({rid:'RID-1',steps});assert.equal(x.complete,true);assert.deepEqual(x.missing,[]) });
