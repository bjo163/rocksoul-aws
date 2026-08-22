// @ts-nocheck
import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { buildApp } from '../apps/api/src/app.js';

async function get(base:string,route:string){const response=await fetch(`${base}${route}`); return {response,body:await response.json()};}

test('v4.24 Revelation API exposes pure Asma and moral graph without legacy 99 route', async()=>{
  const dataDir=await fs.mkdtemp(path.join(os.tmpdir(),'mw-api-revelation-422-'));
  const app=await buildApp({dataDir,persistenceDriver:'file'});
  await app.start(0,'127.0.0.1');
  const address=app.server.address(); assert.ok(address&&typeof address==='object');
  const base=`http://127.0.0.1:${address.port}`;
  try {
    const asma=await get(base,'/api/v1/revelation/asma');
    assert.equal(asma.response.status,200);
    assert.equal(asma.body.protocol,'PURE_REVELATION_ASMA_V1');
    assert.equal(asma.body.invariants.canonical99Hardcoded,false);
    assert.ok(asma.body.candidateCount>100);

    const graph=await get(base,'/api/v1/revelation/moral-graph');
    assert.equal(graph.response.status,200);
    assert.equal(graph.body.protocol,'REVELATION_MORAL_GRAPH_V1');
    assert.ok(graph.body.edges.length>0);

    const core=await get(base,'/api/v1/revelation/core');
    assert.equal(core.response.status,200);
    assert.equal(core.body.version,'4.24.0');
    assert.equal(core.body.asma.protocol,'PURE_REVELATION_ASMA_V1');

    const corpora=await get(base,'/api/v1/revelation/corpora');
    assert.equal(corpora.response.status,200);
    assert.equal(corpora.body.books.QURAN.availability,'FULL_TEXT');
    assert.equal(corpora.body.books.TAWRAT.availability,'FULL_TEXT_TEXTUAL_WITNESS');
    assert.equal(corpora.body.books.ZABUR.availability,'FULL_TEXT_TEXTUAL_WITNESS');
    assert.equal(corpora.body.books.INJIL.availability,'FULL_TEXT_TEXTUAL_WITNESS');

    const old=await get(base,'/api/v1/revelation/divine-attributes');
    assert.equal(old.response.status,404);
  } finally { await app.close(); await fs.rm(dataDir,{recursive:true,force:true}); }
});
