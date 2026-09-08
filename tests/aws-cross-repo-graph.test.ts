import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { MemoryProvider } from '../packages/persistence/src/memory.js';
import { AwsLegalStore } from '../packages/orchestrator/src/aws/legal-store.js';
import {
  AwsCrossRepoGraphService,
  createAwsCaseGraphEdgeId,
  createAwsForeignRefId,
  validateAwsForeignReferenceBinding,
  type AwsCrossRepoCaseGraph,
  type AwsForeignReferenceRecord,
} from '../packages/orchestrator/src/aws/cross-repo-graph.js';

const readJson = async <T>(...segments: string[]): Promise<T> =>
  JSON.parse(await readFile(path.join(process.cwd(), ...segments), 'utf8')) as T;

test('foreign reference and graph edge IDs are deterministic', () => {
  assert.equal(
    createAwsForeignRefId(
      'STORY',
      'mftl:MYTH-JERUSALEM-TEMPLE-DESTRUCTION-PROPHECY-000001',
    ),
    'XREF-STORY-10275E334CADCA80AC859AE2',
  );

  assert.equal(
    createAwsCaseGraphEdgeId(
      'CASE-AWS-JERUSALEM-70',
      'CASE_HAS_EVENT',
      'XREF-EVENT-A0FC8556DF976CC50C87C9B5',
    ),
    'GEDGE-B9A57F1D2F5A8F3E8F676D85',
  );
});

test('foreign reference binding rejects repository and prefix drift', () => {
  assert.throws(
    () =>
      validateAwsForeignReferenceBinding({
        id: createAwsForeignRefId('STORY', 'mftl:X'),
        domain: 'STORY',
        canonical_ref: 'mftl:X',
        repository: 'bjo163/wrong-repo',
      }),
    /AWS_FOREIGN_REPOSITORY_MISMATCH/,
  );

  assert.throws(
    () =>
      validateAwsForeignReferenceBinding({
        id: createAwsForeignRefId('EVENT', 'mftl:X'),
        domain: 'EVENT',
        canonical_ref: 'mftl:X',
        repository: 'bjo163/rocksoul-legend',
      }),
    /AWS_FOREIGN_PREFIX_MISMATCH/,
  );
});

test('a missing foreign canonical record is data, not local corruption', async () => {
  const persistence = new MemoryProvider();
  const legal = new AwsLegalStore(persistence);
  const graph = new AwsCrossRepoGraphService(legal);

  const missing = await graph.persistMissingForeignReference({
    domain: 'STORY',
    canonicalRef: 'mftl:MYTH-NOT-FOUND',
    verifiedAt: '2026-09-08T00:16:16Z',
  });

  assert.equal(missing.verification.state, 'MISSING');
  assert.equal(missing.verification.match_kind, 'NOT_FOUND');
  assert.equal(missing.ownership, 'FOREIGN');

  const stored = await legal.getRecord(missing.id);
  assert.equal(stored?.kind, 'FOREIGN_REF');
  assert.equal(stored?.payload.verification.state, 'MISSING');
});

test('Jerusalem runtime graph traverses all five domains and reverse impact', async () => {
  const persistence = new MemoryProvider();
  const legal = new AwsLegalStore(persistence);
  const graphService = new AwsCrossRepoGraphService(legal);

  await legal.upsertRecord('CASE', 'CASE-AWS-JERUSALEM-70', { title: 'Jerusalem 70' });
  await legal.upsertRecord('INSTRUMENT', 'LAW-IHL-GCIV-1949', {});
  await legal.upsertRecord('APPLICABILITY', 'APPL-JERUSALEM-70-GCIV', {});
  await legal.upsertRecord('CLAIM', 'LCLAIM-JERUSALEM-70-GCIV-TEMPORAL', {});
  await legal.upsertRecord('ASSESSMENT', 'LASSMT-JERUSALEM-70-GCIV', {});

  const foreignNames = [
    'XREF-STORY-10275E334CADCA80AC859AE2.json',
    'XREF-EVENT-A0FC8556DF976CC50C87C9B5.json',
    'XREF-PERSON-DA34747C86B82AD6B56287C9.json',
    'XREF-RGBL-DD461790D15681E5F12950B3.json',
    'XREF-RGBL-761C914690B77F9724FD59FC.json',
  ];

  for (const name of foreignNames) {
    const record = await readJson<AwsForeignReferenceRecord>(
      'data',
      'aws',
      'foreign_refs',
      name,
    );
    await graphService.persistForeignReference(record);
  }

  const canonicalGraph = await readJson<AwsCrossRepoCaseGraph>(
    'data',
    'aws',
    'case_graphs',
    'CGRAPH-JERUSALEM-70-FIVE-DOMAIN.json',
  );

  const persisted = await graphService.persistCaseGraph(canonicalGraph);
  assert.equal(persisted.changed, true);

  const edges = await graphService.getCaseEdges('CASE-AWS-JERUSALEM-70');
  assert.equal(edges.length, 9);
  assert.equal(edges.filter((edge) => edge.relation === 'CASE_HAS_STORY').length, 1);
  assert.equal(edges.filter((edge) => edge.relation === 'CASE_HAS_EVENT').length, 1);
  assert.equal(edges.filter((edge) => edge.relation === 'CASE_HAS_PERSON').length, 1);
  assert.equal(edges.filter((edge) => edge.relation === 'CASE_HAS_RGBL').length, 2);
  assert.equal(edges.filter((edge) => edge.relation.startsWith('CASE_HAS_')).length, 9);

  assert.deepEqual(
    await graphService.findAffectedCasesByForeignRef(
      'XREF-STORY-10275E334CADCA80AC859AE2',
    ),
    ['CASE-AWS-JERUSALEM-70'],
  );

  const story = await legal.getRecord('XREF-STORY-10275E334CADCA80AC859AE2');
  assert.equal(story?.kind, 'FOREIGN_REF');
  assert.equal(story?.payload.ownership, 'FOREIGN');
  assert.equal(story?.payload.snapshot, null);
});

test('runtime graph refuses an edge whose deterministic identity was forged', async () => {
  const persistence = new MemoryProvider();
  const legal = new AwsLegalStore(persistence);
  const graphService = new AwsCrossRepoGraphService(legal);

  await legal.upsertRecord('CASE', 'CASE-AWS-X', {});
  await legal.upsertRecord('INSTRUMENT', 'LAW-X', {});

  await assert.rejects(
    () =>
      graphService.persistCaseGraph({
        id: 'CGRAPH-X',
        case_ref: 'CASE-AWS-X',
        node_refs: ['CASE-AWS-X', 'LAW-X'],
        edges: [
          {
            id: 'GEDGE-000000000000000000000000',
            from_ref: 'CASE-AWS-X',
            relation: 'CASE_HAS_LEGAL_BASIS',
            to_ref: 'LAW-X',
          },
        ],
        research_state: 'CANDIDATE',
      }),
    /AWS_CASE_GRAPH_EDGE_ID_MISMATCH/,
  );
});
