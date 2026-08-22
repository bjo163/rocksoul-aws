// @ts-nocheck
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { FileProvider } from '../packages/persistence/src/file.js';

test('file provider serializes concurrent atomic flushes', async()=>{
  const dir=await mkdtemp(path.join(os.tmpdir(),'mw-file-flush-'));
  try {
    const store=new FileProvider(dir);
    await Promise.all(Array.from({length:20},(_,i)=>store.traceRepository().put({requestId:`REQ-${i}`,correlationId:`COR-${i}`,startedAt:new Date(1700000000000+i).toISOString(),route:'/test',completedAt:new Date(1700000000100+i).toISOString(),statusCode:200,durationMs:100})));
    const traces=await store.traceRepository().list(100); assert.equal(traces.length,20);
    await store.close();
    const reopened=new FileProvider(dir); assert.equal((await reopened.traceRepository().list(100)).length,20); await reopened.close();
  } finally { await rm(dir,{recursive:true,force:true}); }
});
