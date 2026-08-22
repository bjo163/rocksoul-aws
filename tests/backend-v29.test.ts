import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { UniverseStore } from '../src/persistence/universe-store.js';
import { replayEvents } from '../src/audit/event-replay.js';
import { PersistentJobQueue } from '../src/jobs/persistent-job-queue.js';

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
  const q = new PersistentJobQueue(dir);
  const job = await q.enqueue('INDEX',{caseId:'CASE-T'});
  assert.equal((await q.get(job.id))?.status,'QUEUED');
  await q.mark(job.id,'COMPLETED');
  assert.equal((await q.get(job.id))?.status,'COMPLETED');
  await q.close();
});
