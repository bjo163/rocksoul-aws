import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { MemoryProvider } from '../packages/persistence/src/memory.js';
import { PersistentJobQueue } from '../packages/jobs/src/index.js';
import { AwsLegalStore } from '../packages/orchestrator/src/aws/legal-store.js';
import { AwsQueryService } from '../packages/orchestrator/src/aws/query-service.js';
import { AwsObservabilityService } from '../packages/orchestrator/src/aws/observability-service.js';
import { AwsResearchOperatorService } from '../packages/orchestrator/src/aws/research-operator.js';
import { fingerprintAwsSourcePayload } from '../packages/orchestrator/src/aws/source-worker.js';

test('AWS query service returns a stable legal-case bundle and typed graph', async () => {
  const persistence = new MemoryProvider();
  const store = new AwsLegalStore(persistence);
  const query = new AwsQueryService(store);

  await store.upsertRecord('LEGAL_CASE', 'LCASE-Q', {
    authority_refs: ['AUTH-Q'],
    holding_refs: ['HOLD-Q'],
    applicability_refs: ['APPL-Q'],
    claim_refs: ['LCLAIM-Q'],
    claim_assessment_refs: ['CASSMT-Q'],
    case_synthesis_refs: ['CSYN-Q'],
    assessment_refs: ['LASSMT-Q'],
  });
  await store.upsertRecord('AUTHORITY', 'AUTH-Q', { authority_type: 'JUDGMENT' });
  await store.upsertRecord('HOLDING', 'HOLD-Q', { proposition: 'narrow holding' });
  await store.upsertRecord('APPLICABILITY', 'APPL-Q', { overall: 'APPLICABLE' });
  await store.upsertRecord('CLAIM', 'LCLAIM-Q', { proposition: 'claim' });
  await store.upsertRecord('CLAIM_ASSESSMENT', 'CASSMT-Q', { result: 'SUPPORTED' });
  await store.upsertRecord('CASE_SYNTHESIS', 'CSYN-Q', { result: 'CONSISTENT_SUPPORT', legal_result: 'UNRESOLVED', mizan_status: 'NOT_RUN' });
  await store.upsertRecord('ASSESSMENT', 'LASSMT-Q', { legal_result: 'UNRESOLVED', mizan: { status: 'NOT_RUN' } });
  await store.upsertRecord('FOREIGN_REF', 'XREF-STORY-Q', { ownership: 'FOREIGN', canonical_ref: 'mftl:Q' });
  await store.linkTypedRelation('LCASE-Q', 'CASE_HAS_STORY', 'XREF-STORY-Q');

  const bundle = await query.getCase('LCASE-Q');
  assert.ok(bundle);
  assert.equal(bundle?.case.kind, 'LEGAL_CASE');
  assert.deepEqual(bundle?.legal.authorities.map((item) => item.id), ['AUTH-Q']);
  assert.deepEqual(bundle?.legal.holdings.map((item) => item.id), ['HOLD-Q']);
  assert.deepEqual(bundle?.legal.applicability.map((item) => item.id), ['APPL-Q']);
  assert.deepEqual(bundle?.legal.claims.map((item) => item.id), ['LCLAIM-Q']);
  assert.deepEqual(bundle?.legal.claim_assessments.map((item) => item.id), ['CASSMT-Q']);
  assert.deepEqual(bundle?.legal.case_syntheses.map((item) => item.id), ['CSYN-Q']);
  assert.deepEqual(bundle?.foreign_refs.map((item) => item.id), ['XREF-STORY-Q']);
  assert.equal(bundle?.foreign_refs[0]?.payload.ownership, 'FOREIGN');

  const graph = await query.getCaseGraph('LCASE-Q');
  assert.ok(graph?.relations.some((relation) => relation.type === 'CASE_HAS_STORY'));
  assert.equal(await query.getCase('LCASE-MISSING'), null);
});

test('source query returns revision history without treating it as canonical law mutation', async () => {
  const persistence = new MemoryProvider();
  const store = new AwsLegalStore(persistence);
  const query = new AwsQueryService(store);
  await store.upsertRecord('SOURCE', 'SRC-AWS-Q', { publisher: 'Official' });
  const payload1 = { parties: 1 };
  const payload2 = { parties: 2 };
  await store.persistSourceRevision({ sourceId: 'SRC-AWS-Q', sourceUrl: 'https://official.example/q', capturedAt: '2026-09-08T00:00:00.000Z', fingerprint: fingerprintAwsSourcePayload(payload1), payload: payload1 });
  await store.persistSourceRevision({ sourceId: 'SRC-AWS-Q', sourceUrl: 'https://official.example/q', capturedAt: '2026-09-08T01:00:00.000Z', fingerprint: fingerprintAwsSourcePayload(payload2), payload: payload2 });
  await store.upsertRecord('SOURCE_FRESHNESS', 'FRESH-AWS-Q', { source_ref: 'SRC-AWS-Q', freshness_state: 'FRESH', change_state: 'REVIEW_REQUIRED' });

  const sources = await query.listSources();
  assert.equal(sources.length, 1);
  assert.equal(sources[0]?.latest_revision?.captured_at, '2026-09-08T01:00:00.000Z');
  const history = await query.listSourceRevisions('SRC-AWS-Q');
  assert.deepEqual(history?.revisions.map((item) => item.captured_at), ['2026-09-08T01:00:00.000Z', '2026-09-08T00:00:00.000Z']);
  assert.equal(history?.revisions[0]?.payload.parties, 2);
});

test('AWS observability summarizes health without becoming evidence', async () => {
  const persistence = new MemoryProvider();
  const store = new AwsLegalStore(persistence);
  const jobs = new PersistentJobQueue(persistence, 60_000, { workerId: 'phase8-observability' });
  const observability = new AwsObservabilityService(store, jobs);

  await store.upsertRecord('CASE', 'CASE-AWS-OBS', {});
  await store.upsertRecord('LEGAL_CASE', 'LCASE-OBS', {});
  await store.upsertRecord('SOURCE_FRESHNESS', 'FRESH-AWS-OBS', { source_ref: 'SRC-AWS-OBS', freshness_state: 'STALE', change_state: 'REVIEW_REQUIRED' });
  await store.upsertRecord('RESEARCH_RUN', 'RRUN-AWS-OBS', { status: 'COMPLETED' });
  await store.upsertRecord('RESEARCH_REVIEW', 'RVIEW-AWS-OBS', { state: 'REVIEW_REQUIRED' });
  await store.upsertRecord('REANALYSIS_CANDIDATE', 'RCAND-AWS-OBS', { review_state: 'REVIEW_REQUIRED' });
  await jobs.enqueue('AWS_REANALYZE_CASE', { caseId: 'CASE-AWS-OBS' }, 'phase8-observability');

  const snapshot = await observability.snapshot();
  assert.equal(snapshot.cases.total, 2);
  assert.equal(snapshot.sources.freshness.STALE, 1);
  assert.equal(snapshot.sources.change_state.REVIEW_REQUIRED, 1);
  assert.equal(snapshot.research.runs.by_status.COMPLETED, 1);
  assert.equal(snapshot.research.reviews.by_state.REVIEW_REQUIRED, 1);
  assert.equal(snapshot.research.candidates.review_required, 1);
  assert.equal(snapshot.jobs.by_type.AWS_REANALYZE_CASE, 1);
  assert.equal(snapshot.integrity.events.valid, true);
  assert.equal(snapshot.integrity.audit.valid, true);
  assert.equal(Object.hasOwn(snapshot, 'legal_result'), false);
});

test('operator reanalysis only queues dependent case at latest revision and never mutates canonical state', async () => {
  const persistence = new MemoryProvider();
  const store = new AwsLegalStore(persistence);
  const jobs = new PersistentJobQueue(persistence, 60_000, { workerId: 'phase8-operator' });
  const operator = new AwsResearchOperatorService(store, jobs);

  await store.upsertRecord('SOURCE', 'SRC-AWS-OP', {});
  await store.upsertRecord('LEGAL_CASE', 'LCASE-OP', {});
  await store.upsertRecord('ASSESSMENT', 'LASSMT-OP', { legal_result: 'UNRESOLVED', mizan: { status: 'NOT_RUN' } });
  await store.linkDependency('LCASE-OP', 'SRC-AWS-OP');
  const payload = { version: 1 };
  const revision = await store.persistSourceRevision({ sourceId: 'SRC-AWS-OP', sourceUrl: 'https://official.example/op', capturedAt: '2026-09-08T00:00:00.000Z', fingerprint: fingerprintAwsSourcePayload(payload), payload });

  const result = await operator.requestReanalysis({ caseId: 'LCASE-OP', sourceId: 'SRC-AWS-OP', requestedBy: 'USER-OP' });
  assert.equal(result.revision_ref, revision.revisionId);
  assert.equal(result.status, 'QUEUED');
  assert.equal(result.canonical_mutation, false);
  assert.equal(result.mizan_auto_run, false);
  const queued = await jobs.list('QUEUED');
  assert.equal(queued.length, 1);
  assert.equal(queued[0]?.type, 'AWS_REANALYZE_CASE');
  const canonical = await store.getRecord('LASSMT-OP');
  assert.equal(canonical?.version, 1);
  assert.equal(canonical?.payload.legal_result, 'UNRESOLVED');
  assert.deepEqual(canonical?.payload.mizan, { status: 'NOT_RUN' });

  await store.upsertRecord('LEGAL_CASE', 'LCASE-UNRELATED', {});
  await assert.rejects(
    () => operator.requestReanalysis({ caseId: 'LCASE-UNRELATED', sourceId: 'SRC-AWS-OP', requestedBy: 'USER-OP' }),
    /AWS_OPERATOR_CASE_NOT_DEPENDENT_ON_SOURCE/,
  );
});

test('native AWS route contract is mounted and preserves permission boundaries', async () => {
  const route = await fs.readFile(path.join(process.cwd(), 'apps', 'api', 'src', 'routes', 'aws.routes.ts'), 'utf8');
  const composition = await fs.readFile(path.join(process.cwd(), 'apps', 'api', 'src', 'routes', 'index.ts'), 'utf8');
  const expected = [
    "GET', '/api/v1/aws/cases/:id'",
    "GET', '/api/v1/aws/cases/:id/graph'",
    "GET', '/api/v1/aws/cases/:id/history'",
    "GET', '/api/v1/aws/sources'",
    "GET', '/api/v1/aws/sources/:id/revisions'",
    "GET', '/api/v1/aws/research/runs'",
    "GET', '/api/v1/aws/research/reviews'",
    "GET', '/api/v1/aws/observability'",
    "POST', '/api/v1/aws/research/reanalyze'",
  ];
  for (const fragment of expected) assert.ok(route.includes(fragment), fragment);
  assert.match(route, /requirePermission\(req, ctx\.auth, 'READ_AUDIT'\)/);
  assert.match(route, /requirePermission\(req, ctx\.auth, 'COMMAND'\)/);
  const operatorSource = await fs.readFile(path.join(process.cwd(), 'packages', 'orchestrator', 'src', 'aws', 'research-operator.ts'), 'utf8');
  assert.match(operatorSource, /canonical_mutation: false/);
  assert.match(operatorSource, /mizan_auto_run: false/);
  assert.match(composition, /import \{ awsRouter \} from '\.\/aws\.routes\.js'/);
  assert.match(composition, /awsRouter/);
});
