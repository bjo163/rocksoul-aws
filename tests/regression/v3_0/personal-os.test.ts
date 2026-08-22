import test from 'node:test'; import assert from 'node:assert/strict'; import * as os from '../../../src/personal/os/index.js';
test('v3.0 Personal OS metadata',()=>{assert.deepEqual(os.personalOsMetadata(),{name:'MoonWitness Personal OS',version:'3.0.0',mode:'PERSONAL',visibility:'PRIVATE'})});
