// @ts-nocheck
import test from 'node:test'; import assert from 'node:assert/strict'; import {createMemory,scoreMemory} from '../../../src/personal/memory/index.js';
test('v2.23 memory provenance',()=>{const x=createMemory({memoryId:'M-1',rid:'RID-1',content:'fact',source:'SRC-1',confidence:.9});assert.equal(x.visibility,'PRIVATE');assert.equal(scoreMemory(x),.9)});
