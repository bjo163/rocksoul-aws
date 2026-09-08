import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryProvider } from '../packages/persistence/src/memory.js';
import { PersistentJobQueue } from '../packages/jobs/src/index.js';
import { AwsLegalStore } from '../packages/orchestrator/src/aws/legal-store.js';
import { AwsSourceWorker, fingerprintAwsSourcePayload } from '../packages/orchestrator/src/aws/source-worker.js';
import {
  AwsContinuousResearchService,
  type AwsSourcePollerRegistry,
} from '../packages/orchestrator/src/aws/continuous-research.js';
import {
  awsFreshnessId,
  evaluateAwsFreshness,
  type AwsSourceMonitor,
} from '../packages/orchestrator/src/aws/source-freshness.js';
import { diffAwsSourceRevisions } from '../packages/orchestrator/src/aws/revision-diff.js';

const applies = (label: string) => ({
  status: 'APPLIES' as const,
  reasons: [label],
  basis_refs: [],
});

function monitor(overrides: Partial<AwsSourceMonitor> = {}): AwsSourceMonitor {
  return {
    id: 'MON-AWS-TEST',
    source_ref: 'SRC-AWS-TEST',
    adapter_key: 'icrc-gciv',
    enabled: true,
    poll_interval_minutes: 60,
    stale_after_minutes: 120,
    max_attempts: 2,
    retry_base_ms: 100,
    ...overrides,
  };
}

function pollers(fetcher: AwsSourcePollerRegistry['icrc-gciv']): AwsSourcePollerRegistry {
  const unused = async () => {
    throw new Error('UNUSED_POLLER');
  };
  return {
    'icrc-gciv': fetcher,
    'untc-genocide': unused,
    'icj-bosnia-serbia': unused,
  };
}

test('revision diff is deterministic and ignores volatile polling provenance', () => {
  const before = {
    parties: 154,
    source: { retrieved_at: '2026-09-08T00:00:00Z' },
  };
  const afterSame = {
    source: { retrieved_at: '2026-09-09T00:00:00Z' },
    parties: 154,
  };

  const noChange = diffAwsSourceRevisions({
    sourceRef: 'SRC-AWS-UNTC',
    fromRevisionRef: 'REV-1',
    toRevisionRef: 'REV-2',
    before,
    after: afterSame,
  });
  assert.equal(noChange.material, false);
  assert.deepEqual(noChange.added, []);
  assert.deepEqual(noChange.removed, []);
  assert.deepEqual(noChange.changed, []);

  const changed = diffAwsSourceRevisions({
    sourceRef: 'SRC-AWS-UNTC',
    fromRevisionRef: 'REV-1',
    toRevisionRef: 'REV-3',
    before,
    after: { parties: 155 },
  });
  assert.equal(changed.material, true);
  assert.deepEqual(changed.changed, [{ path: '$.parties', before: 154, after: 155 }]);
  assert.equal(changed.id, diffAwsSourceRevisions({
    sourceRef: 'SRC-AWS-UNTC',
    fromRevisionRef: 'REV-1',
    toRevisionRef: 'REV-3',
    before,
    after: { parties: 155 },
  }).id);
});

test('freshness evaluation is deterministic', () => {
  assert.equal(
    evaluateAwsFreshness({
      now: '2026-09-08T02:00:00Z',
      lastSuccessAt: '2026-09-08T01:00:00Z',
      staleAfterMinutes: 120,
    }),
    'FRESH',
  );
  assert.equal(
    evaluateAwsFreshness({
      now: '2026-09-08T04:00:01Z',
      lastSuccessAt: '2026-09-08T01:00:00Z',
      staleAfterMinutes: 120,
    }),
    'STALE',
  );
  assert.equal(
    evaluateAwsFreshness({
      now: '2026-09-08T02:00:00Z',
      lastSuccessAt: '2026-09-08T01:00:00Z',
      staleAfterMinutes: 120,
      currentlyUnavailable: true,
    }),
    'UNAVAILABLE',
  );
});

test('changed poll creates revision diff, review and targeted candidate without canonical mutation', async () => {
  let clock = new Date('2026-09-08T00:00:00.000Z');
  const now = () => new Date(clock);

  const persistence = new MemoryProvider();
  const legal = new AwsLegalStore(persistence);
  const queue = new PersistentJobQueue(persistence, 60_000, {
    workerId: 'phase7-changed',
    maxAttempts: 2,
    retryBaseMs: 100,
    now,
  });
  const worker = new AwsSourceWorker(legal, queue);

  const basePayload = { source_family: 'TEST', parties: 154 };
  await legal.upsertRecord('SOURCE', 'SRC-AWS-TEST', {});
  const baseline = await legal.persistSourceRevision({
    sourceId: 'SRC-AWS-TEST',
    sourceUrl: 'https://official.example/source',
    capturedAt: clock.toISOString(),
    fingerprint: fingerprintAwsSourcePayload(basePayload),
    payload: basePayload,
  });

  await legal.upsertRecord('APPLICABILITY', 'APPL-TEST', {
    dimensions: {
      temporal: applies('t'),
      territorial: applies('x'),
      personal: applies('p'),
      subject_matter: applies('s'),
      jurisdiction: applies('j'),
    },
    overall: 'APPLICABLE',
  });
  await legal.upsertRecord('CASE', 'CASE-AWS-TEST', {
    aws_refs: { applicability: ['APPL-TEST'] },
  });
  await legal.linkDependency('APPL-TEST', 'SRC-AWS-TEST');
  await legal.linkDependency('CASE-AWS-TEST', 'APPL-TEST');

  const applicabilityBefore = await legal.getRecord('APPL-TEST');
  assert.equal(applicabilityBefore?.version, 1);

  const changedPayload = { source_family: 'TEST', parties: 155 };
  const service = new AwsContinuousResearchService(
    legal,
    worker,
    queue,
    pollers(async () => ({
      sourceId: 'SRC-AWS-TEST',
      sourceUrl: 'https://official.example/source',
      capturedAt: now().toISOString(),
      payload: changedPayload,
    })),
    now,
  );
  const mon = monitor();
  service.registerHandlers([mon]);

  const scheduled = await service.scheduleDueSources([mon]);
  assert.equal(scheduled.length, 1);

  const firstPass = await queue.processAvailable();
  assert.equal(firstPass.length, 1);
  assert.equal(firstPass[0]?.type, 'AWS_POLL_SOURCE');
  assert.equal(firstPass[0]?.status, 'COMPLETED');

  const latest = await legal.latestSourceRevision('SRC-AWS-TEST');
  assert.ok(latest);
  assert.notEqual(latest?.revisionId, baseline.revisionId);

  const diffs = await legal.listRecords('REVISION_DIFF');
  assert.equal(diffs.length, 1);
  assert.equal(diffs[0]?.payload.material, true);

  const reviewsBeforeCandidate = await legal.listRecords('RESEARCH_REVIEW');
  assert.equal(reviewsBeforeCandidate.length, 1);
  assert.equal(reviewsBeforeCandidate[0]?.payload.state, 'REVIEW_REQUIRED');
  assert.deepEqual(reviewsBeforeCandidate[0]?.payload.candidate_refs, []);

  const secondPass = await queue.processAvailable();
  assert.equal(secondPass.length, 1);
  assert.equal(secondPass[0]?.type, 'AWS_REANALYZE_CASE');
  assert.equal(secondPass[0]?.status, 'COMPLETED');

  const candidates = await legal.listRecords('REANALYSIS_CANDIDATE');
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0]?.payload.case_ref, 'CASE-AWS-TEST');
  assert.equal(candidates[0]?.payload.canonical_mutation, false);
  assert.equal(candidates[0]?.payload.review_state, 'REVIEW_REQUIRED');
  assert.deepEqual(candidates[0]?.payload.changed_scopes, ['SOURCE_CONTENT']);

  const applicabilityAfter = await legal.getRecord('APPL-TEST');
  assert.equal(applicabilityAfter?.version, 1);
  assert.equal(applicabilityAfter?.payload.overall, 'APPLICABLE');

  const reviewsAfterCandidate = await legal.listRecords('RESEARCH_REVIEW');
  assert.deepEqual(
    reviewsAfterCandidate[0]?.payload.candidate_refs,
    [candidates[0]?.id],
  );

  const freshness = await legal.getRecord(awsFreshnessId('SRC-AWS-TEST'));
  assert.equal(freshness?.payload.freshness_state, 'FRESH');
  assert.equal(freshness?.payload.change_state, 'REVIEW_REQUIRED');

  assert.equal((await legal.verifyEventIntegrity()).valid, true);
  assert.equal((await legal.verifyAuditIntegrity()).valid, true);

  clock = new Date('2026-09-08T01:00:01.000Z');
  const unchangedScheduled = await service.scheduleDueSources([mon]);
  assert.equal(unchangedScheduled.length, 1);
  await queue.processAvailable();

  assert.equal((await legal.listRecords('REVISION_DIFF')).length, 1);
  assert.equal((await legal.listRecords('REANALYSIS_CANDIDATE')).length, 1);
  const freshnessAfterUnchanged = await legal.getRecord(awsFreshnessId('SRC-AWS-TEST'));
  assert.equal(freshnessAfterUnchanged?.payload.freshness_state, 'FRESH');
  assert.equal(freshnessAfterUnchanged?.payload.change_state, 'REVIEW_REQUIRED');
});

test('source failure preserves last good revision, retries, dead-letters and marks unavailable', async () => {
  let clock = new Date('2026-09-08T00:00:00.000Z');
  const now = () => new Date(clock);

  const persistence = new MemoryProvider();
  const legal = new AwsLegalStore(persistence);
  const queue = new PersistentJobQueue(persistence, 60_000, {
    workerId: 'phase7-dead-letter',
    maxAttempts: 2,
    retryBaseMs: 100,
    now,
  });
  const worker = new AwsSourceWorker(legal, queue);

  const basePayload = { source_family: 'TEST', version: 1 };
  const baseline = await legal.persistSourceRevision({
    sourceId: 'SRC-AWS-TEST',
    sourceUrl: 'https://official.example/source',
    capturedAt: clock.toISOString(),
    fingerprint: fingerprintAwsSourcePayload(basePayload),
    payload: basePayload,
  });

  const service = new AwsContinuousResearchService(
    legal,
    worker,
    queue,
    pollers(async () => {
      throw new Error('OFFICIAL_SOURCE_DOWN');
    }),
    now,
  );
  const mon = monitor();
  service.registerHandlers([mon]);

  await service.scheduleDueSources([mon]);
  const attempt1 = await queue.processAvailable();
  assert.equal(attempt1[0]?.status, 'QUEUED');
  assert.equal(attempt1[0]?.attemptCount, 1);

  let freshness = await legal.getRecord(awsFreshnessId('SRC-AWS-TEST'));
  assert.equal(freshness?.payload.freshness_state, 'UNAVAILABLE');
  assert.equal(freshness?.payload.consecutive_failures, 1);

  const latestAfterFailure = await legal.latestSourceRevision('SRC-AWS-TEST');
  assert.equal(latestAfterFailure?.revisionId, baseline.revisionId);

  clock = new Date('2026-09-08T00:00:00.200Z');
  const attempt2 = await queue.processAvailable();
  assert.equal(attempt2[0]?.status, 'DEAD_LETTER');
  assert.equal(attempt2[0]?.attemptCount, 2);

  const synchronized = await service.syncDeadLetterRuns();
  assert.equal(synchronized.length, 1);

  const runs = await legal.listRecords('RESEARCH_RUN');
  assert.equal(runs.length, 1);
  assert.equal(runs[0]?.payload.status, 'DEAD_LETTER');
  assert.match(String(runs[0]?.payload.error), /OFFICIAL_SOURCE_DOWN/);

  freshness = await legal.getRecord(awsFreshnessId('SRC-AWS-TEST'));
  assert.equal(freshness?.payload.freshness_state, 'UNAVAILABLE');
  assert.equal(freshness?.payload.consecutive_failures, 2);
  assert.equal((await legal.latestSourceRevision('SRC-AWS-TEST'))?.revisionId, baseline.revisionId);
});

test('stale-state refresh does not create source revisions or verdicts', async () => {
  let clock = new Date('2026-09-08T04:00:01.000Z');
  const now = () => new Date(clock);
  const persistence = new MemoryProvider();
  const legal = new AwsLegalStore(persistence);
  const queue = new PersistentJobQueue(persistence, 60_000, {
    workerId: 'phase7-stale',
    now,
  });
  const worker = new AwsSourceWorker(legal, queue);
  const service = new AwsContinuousResearchService(
    legal,
    worker,
    queue,
    pollers(async () => {
      throw new Error('SHOULD_NOT_POLL');
    }),
    now,
  );
  const mon = monitor({ stale_after_minutes: 120 });

  await legal.upsertRecord('SOURCE_FRESHNESS', awsFreshnessId(mon.source_ref), {
    id: awsFreshnessId(mon.source_ref),
    source_ref: mon.source_ref,
    freshness_state: 'FRESH',
    change_state: 'UNCHANGED',
    last_checked_at: '2026-09-08T01:00:00.000Z',
    last_success_at: '2026-09-08T01:00:00.000Z',
    last_change_at: null,
    next_due_at: '2026-09-08T02:00:00.000Z',
    consecutive_failures: 0,
    last_error: null,
  });

  assert.deepEqual(await service.refreshStaleStates([mon]), ['SRC-AWS-TEST']);
  const freshness = await legal.getRecord(awsFreshnessId(mon.source_ref));
  assert.equal(freshness?.payload.freshness_state, 'STALE');
  assert.equal((await legal.listRecords('ASSESSMENT')).length, 0);
});
