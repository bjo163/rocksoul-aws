// @ts-nocheck
import test from 'node:test'; import assert from 'node:assert/strict'; import {buildCommandCenter} from '../../../src/personal/command-center/index.js';
test('v2.21 command center',()=>{const x=buildCommandCenter({rid:'RID-1'});assert.equal(x.rid,'RID-1');assert.equal(x.health.ok,true)});
