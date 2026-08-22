import test from 'node:test';
import assert from 'node:assert/strict';
import { UniverseClient } from '../../packages/sdk/src/index.js';
const mock: typeof fetch=async(url,_init)=>new Response(JSON.stringify({ok:true,url:String(url)}),{status:200,headers:{'content-type':'application/json'}});
test('UniverseClient routes',async()=>{const c=new UniverseClient({baseUrl:'http://example',fetchImpl:mock});const surface=c as unknown as Record<string, unknown>;for(const [k] of [['observe'],['analyze'],['evaluate'],['query'],['command'],['resource']]){assert.equal(typeof surface[k],'function');}assert.equal((await c.resource('X')).ok,true)});
