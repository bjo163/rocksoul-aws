import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { PersistenceClient, UniverseStore } from '@moonwitness/persistence';
import { replayEvents } from '../src/audit/event-replay.js';
import { PersistentJobQueue } from '@moonwitness/jobs';

test('case aggregate + evidence + replay', async () => {
  const dir = await mkdtemp(`${tmpdir()}/mw-v29-test-`);
  const store = new UniverseStore({ dataDir: dir });
  const c = await store.upsertCase({ id:'CASE-T', observation:{text:'test'}, analysis:{sourceMatches:[{type:'Q',reference:'Q2:1',status:'SUPPORTED',confidence:0.9,payload:{ok:true}}]}, lifecycle:null });
  assert.equal(c.id,'CASE-T');
  assert.equal((await store.getCase('CASE-T'))?.id,'CASE-T');
  assert.equal((await store.listCaseEvidence('CASE-T')).length,1);
  const events=await store.listCaseEvents('CASE-T');
  const replay=replayEvents(events);
  assert.equal(replay.eventCount,events.length);
  assert.ok(replay.lastEventId);
  assert.equal((await store.verifyLedger()).valid,true);
  await store.close();
});

test('persistent worker job', async () => {
  const dir = await mkdtemp(`${tmpdir()}/mw-job-`);
  const persistence = new PersistenceClient({ driver: 'file', fileDir: dir });
  const q = new PersistentJobQueue(persistence.store);
  const job = await q.enqueue('INDEX',{caseId:'CASE-T'});
  assert.equal((await q.get(job.id))?.status,'QUEUED');
  q.register('INDEX', async () => ({ ok: true }));
  await q.processAvailable();
  assert.equal((await q.get(job.id))?.status,'COMPLETED');
  await persistence.close();
});
