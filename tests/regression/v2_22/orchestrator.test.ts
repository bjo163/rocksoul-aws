import test from 'node:test'; import assert from 'node:assert/strict'; import {orchestrate} from '../../../src/personal/orchestrator/index.js';
test('v2.22 orchestrator verification intent',()=>{const x=orchestrate('tolong verify quote kitab ini');assert.equal(x.intent,'VERIFICATION');assert(x.confidence>0.5)});
