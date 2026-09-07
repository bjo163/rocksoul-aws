import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryProvider } from '../packages/persistence/src/memory.js';
import { PersistentJobQueue } from '../packages/jobs/src/index.js';
import { AwsLegalStore } from '../packages/orchestrator/src/aws/legal-store.js';
import { AwsSourceWorker, fingerprintAwsSourcePayload } from '../packages/orchestrator/src/aws/source-worker.js';

test('AWS source worker persists revisions and queues only dependent cases', async () => {
  const persistence = new MemoryProvider();
  const legal = new AwsLegalStore(persistence);
  const jobs = new PersistentJobQueue(persistence, 60_000, {
    workerId: 'aws-test-worker',
    now: () => new Date('2026-09-08T00:00:00.000Z'),
  });
  const worker = new AwsSourceWorker(legal, jobs);

  await legal.upsertRecord('SOURCE', 'SRC-AWS-ICRC-IHL', {
    canonical_url: 'https://ihl-databases.icrc.org/en/ihl-treaties',
  });
  await legal.upsertRecord('INSTRUMENT', 'LAW-IHL-GCIV-1949', {
    title: 'Geneva Convention IV',
  });
  await legal.upsertRecord('APPLICABILITY', 'APPL-JERUSALEM-70-GCIV', {
    overall: 'NOT_APPLICABLE',
  });
  await legal.upsertRecord('ASSESSMENT', 'LASSMT-JERUSALEM-70-GCIV', {
    legal_result: 'UNRESOLVED',
    review: { status: 'REQUIRED' },
  });
  await legal.upsertRecord('CASE', 'CASE-AWS-JERUSALEM-70', {
    legal_result: 'UNRESOLVED',
  });
  await legal.upsertRecord('SOURCE', 'SRC-AWS-UNRELATED', {
    canonical_url: 'https://example.invalid/official-source',
  });
  await legal.upsertRecord('CASE', 'CASE-AWS-UNRELATED', {
    legal_result: 'UNRESOLVED',
  });

  await legal.linkDependency('LAW-IHL-GCIV-1949', 'SRC-AWS-ICRC-IHL');
  await legal.linkDependency('APPL-JERUSALEM-70-GCIV', 'LAW-IHL-GCIV-1949');
  await legal.linkDependency('LASSMT-JERUSALEM-70-GCIV', 'APPL-JERUSALEM-70-GCIV');
  await legal.linkDependency('CASE-AWS-JERUSALEM-70', 'LASSMT-JERUSALEM-70-GCIV');
  await legal.linkDependency('CASE-AWS-UNRELATED', 'SRC-AWS-UNRELATED');

  const initialPayload = {
    title: 'Geneva Convention IV',
    adoption_date: '1949-08-12',
    entry_into_force_date: '1950-10-21',
  };

  const first = await worker.process({
    sourceId: 'SRC-AWS-ICRC-IHL',
    sourceUrl: 'https://ihl-databases.icrc.org/en/ihl-treaties/gciv-1949/title',
    capturedAt: '2026-09-08T00:00:00.000Z',
    payload: initialPayload,
  });

  assert.equal(first.changed, true);
  assert.deepEqual(first.affectedCaseIds, ['CASE-AWS-JERUSALEM-70']);
  assert.equal(first.enqueuedJobIds.length, 1);
  assert.equal(first.fingerprint, fingerprintAwsSourcePayload(initialPayload));

  const queuedAfterFirst = await jobs.list('QUEUED');
  assert.equal(queuedAfterFirst.length, 1);
  assert.deepEqual(queuedAfterFirst[0]?.payload, {
    caseId: 'CASE-AWS-JERUSALEM-70',
    sourceId: 'SRC-AWS-ICRC-IHL',
    revisionId: first.revision?.revisionId,
    fingerprint: first.fingerprint,
  });

  const second = await worker.process({
    sourceId: 'SRC-AWS-ICRC-IHL',
    sourceUrl: 'https://ihl-databases.icrc.org/en/ihl-treaties/gciv-1949/title',
    capturedAt: '2026-09-08T01:00:00.000Z',
    payload: { ...initialPayload },
  });

  assert.equal(second.changed, false);
  assert.deepEqual(second.affectedCaseIds, []);
  assert.deepEqual(second.enqueuedJobIds, []);
  assert.equal((await jobs.list('QUEUED')).length, 1);

  const changed = await worker.process({
    sourceId: 'SRC-AWS-ICRC-IHL',
    sourceUrl: 'https://ihl-databases.icrc.org/en/ihl-treaties/gciv-1949/title',
    capturedAt: '2026-09-08T02:00:00.000Z',
    payload: { ...initialPayload, official_metadata_revision: 2 },
  });

  assert.equal(changed.changed, true);
  assert.deepEqual(changed.affectedCaseIds, ['CASE-AWS-JERUSALEM-70']);
  assert.equal((await jobs.list('QUEUED')).length, 2);

  const assessment = await legal.getRecord('LASSMT-JERUSALEM-70-GCIV');
  assert.equal(assessment?.payload.legal_result, 'UNRESOLVED');

  const eventIntegrity = await legal.verifyEventIntegrity();
  assert.equal(eventIntegrity.valid, true);
  assert.equal(eventIntegrity.events, 2);

  const auditIntegrity = await legal.verifyAuditIntegrity();
  assert.equal(auditIntegrity.valid, true);
});

test('AWS fingerprint is stable across object key order and ignores polling time', () => {
  const a = fingerprintAwsSourcePayload({ b: 2, a: { y: 2, x: 1 } });
  const b = fingerprintAwsSourcePayload({ a: { x: 1, y: 2 }, b: 2 });
  assert.equal(a, b);
});

test('AWS dependency traversal is transitive and excludes unrelated cases', async () => {
  const persistence = new MemoryProvider();
  const legal = new AwsLegalStore(persistence);

  await legal.upsertRecord('SOURCE', 'SRC-AWS-A', {});
  await legal.upsertRecord('INSTRUMENT', 'LAW-A', {});
  await legal.upsertRecord('CLAIM', 'LCLAIM-A', {});
  await legal.upsertRecord('CASE', 'CASE-AWS-A', {});
  await legal.upsertRecord('CASE', 'CASE-AWS-B', {});

  await legal.linkDependency('LAW-A', 'SRC-AWS-A');
  await legal.linkDependency('LCLAIM-A', 'LAW-A');
  await legal.linkDependency('CASE-AWS-A', 'LCLAIM-A');

  assert.deepEqual(await legal.findDependentCases('SRC-AWS-A'), ['CASE-AWS-A']);
});
