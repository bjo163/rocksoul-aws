import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { MemoryProvider } from '../packages/persistence/src/memory.js';
import { PersistentJobQueue } from '../packages/jobs/src/index.js';
import {
  AwsOfficialSourceHttpClient,
  type AwsHttpTransport,
  type AwsHttpTransportResponse,
} from '../packages/orchestrator/src/aws/source-http.js';
import {
  AwsIcrcAdapter,
  AWS_ICRC_GCIV_TITLE_URL,
  parseIcrcGcivTitlePage,
} from '../packages/orchestrator/src/aws/icrc-adapter.js';
import {
  AwsUntcAdapter,
  AWS_UNTC_GENOCIDE_URL,
  parseUntcGenocidePage,
} from '../packages/orchestrator/src/aws/untc-adapter.js';
import {
  createAwsTreatyActionId,
  persistAwsTreatyActionCandidates,
} from '../packages/orchestrator/src/aws/treaty-actions.js';
import { AwsLegalStore } from '../packages/orchestrator/src/aws/legal-store.js';
import { AwsSourceWorker } from '../packages/orchestrator/src/aws/source-worker.js';

const fixture = (name: string) =>
  path.join(process.cwd(), 'tests', 'fixtures', 'aws', name);

class StubTransport implements AwsHttpTransport {
  readonly calls: string[] = [];
  constructor(private readonly responses: AwsHttpTransportResponse[]) {}

  async request(url: string): Promise<AwsHttpTransportResponse> {
    this.calls.push(url);
    const next = this.responses.shift();
    if (!next) throw new Error('stub exhausted');
    return next;
  }
}

function response(url: string, body: string, status = 200, contentType = 'text/html; charset=utf-8'): AwsHttpTransportResponse {
  return {
    url,
    status,
    headers: { 'content-type': contentType },
    body: new TextEncoder().encode(body),
  };
}

test('ICRC fixture normalizes GC IV official metadata', async () => {
  const html = await readFile(fixture('icrc-gciv-title.html'), 'utf8');
  assert.deepEqual(parseIcrcGcivTitlePage(html), {
    source_family: 'ICRC_IHL',
    instrument_id: 'LAW-IHL-GCIV-1949',
    stable_id: 'icrc:gciv-1949',
    title: 'Convention (IV) relative to the Protection of Civilian Persons in Time of War',
    short_title: 'Geneva Convention IV',
    instrument_type: 'convention',
    adoption_date: '1949-08-12',
    source_role: 'PRIMARY_TEXT',
  });
});

test('UNTC fixture keeps signature, ratification, accession, and succession distinct', async () => {
  const html = await readFile(fixture('untc-genocide-status.html'), 'utf8');
  const capturedAt = '2026-09-08T00:00:00.000Z';
  const payload = parseUntcGenocidePage(html, capturedAt);

  assert.equal(payload.instrument_id, 'LAW-UN-GENOCIDE-1948');
  assert.equal(payload.adoption_date, '1948-12-09');
  assert.equal(payload.entry_into_force_date, '1951-01-12');
  assert.equal(payload.signatories, 41);
  assert.equal(payload.parties, 154);

  const australia = payload.treaty_actions.filter((item) => item.actor_name === 'Australia');
  assert.deepEqual(australia.map((item) => item.action), ['signature', 'ratification']);
  assert.deepEqual(australia.map((item) => item.action_date), ['1948-12-11', '1949-07-08']);

  assert.equal(
    payload.treaty_actions.find((item) => item.actor_name === 'Afghanistan')?.action,
    'accession',
  );
  assert.equal(
    payload.treaty_actions.find((item) => item.actor_name === 'Croatia')?.action,
    'succession',
  );
});

test('official-source HTTP boundary rejects non-official origins before transport', async () => {
  const transport = new StubTransport([]);
  const client = new AwsOfficialSourceHttpClient(transport);

  await assert.rejects(
    () => client.getText('https://example.com/not-official', {
      allowedOrigins: ['https://treaties.un.org'],
      retries: 0,
    }),
    /AWS_SOURCE_ORIGIN_REJECTED/,
  );
  assert.equal(transport.calls.length, 0);
});

test('official-source HTTP boundary rejects redirects instead of silently following', async () => {
  const transport = new StubTransport([
    response(AWS_UNTC_GENOCIDE_URL, '', 302),
  ]);
  const client = new AwsOfficialSourceHttpClient(transport);

  await assert.rejects(
    () => client.getText(AWS_UNTC_GENOCIDE_URL, {
      allowedOrigins: ['https://treaties.un.org'],
      retries: 0,
    }),
    /AWS_SOURCE_REDIRECT_REJECTED:302/,
  );
});

test('ICRC adapter returns a verified snapshot consumable by AwsSourceWorker', async () => {
  const html = await readFile(fixture('icrc-gciv-title.html'), 'utf8');
  const client = new AwsOfficialSourceHttpClient(
    new StubTransport([response(AWS_ICRC_GCIV_TITLE_URL, html)]),
  );
  const adapter = new AwsIcrcAdapter(client, () => new Date('2026-09-08T00:00:00.000Z'));
  const snapshot = await adapter.fetchGciv();

  const persistence = new MemoryProvider();
  const legal = new AwsLegalStore(persistence);
  const jobs = new PersistentJobQueue(persistence, 60_000, {
    workerId: 'aws-source-adapter-test',
    now: () => new Date('2026-09-08T00:00:00.000Z'),
  });
  const worker = new AwsSourceWorker(legal, jobs);

  await legal.upsertRecord('SOURCE', 'SRC-AWS-ICRC-IHL', {});
  const result = await worker.process(snapshot);

  assert.equal(result.changed, true);
  assert.equal(snapshot.sourceId, 'SRC-AWS-ICRC-IHL');
  assert.equal(snapshot.payload.instrument_id, 'LAW-IHL-GCIV-1949');
});

test('UNTC adapter output can persist deterministic treaty-action records', async () => {
  const html = await readFile(fixture('untc-genocide-status.html'), 'utf8');
  const client = new AwsOfficialSourceHttpClient(
    new StubTransport([response(AWS_UNTC_GENOCIDE_URL, html)]),
  );
  const adapter = new AwsUntcAdapter(client, () => new Date('2026-09-08T00:00:00.000Z'));
  const snapshot = await adapter.fetchGenocideConvention();
  const payload = snapshot.payload as ReturnType<typeof parseUntcGenocidePage>;

  const persistence = new MemoryProvider();
  const legal = new AwsLegalStore(persistence);

  await legal.upsertRecord('SOURCE', 'SRC-AWS-UNTC', {});
  await legal.upsertRecord('INSTRUMENT', 'LAW-UN-GENOCIDE-1948', {});

  const ids = await persistAwsTreatyActionCandidates(
    legal,
    'SRC-AWS-UNTC',
    payload.treaty_actions,
  );

  assert.equal(ids.length, 4);
  const australiaSignature = payload.treaty_actions.find(
    (item) => item.actor_name === 'Australia' && item.action === 'signature',
  );
  assert.ok(australiaSignature);
  const id1 = createAwsTreatyActionId(australiaSignature);
  const id2 = createAwsTreatyActionId({ ...australiaSignature });
  assert.equal(id1, id2);

  const stored = await legal.getRecord(id1);
  assert.equal(stored?.kind, 'TREATY_ACTION');
  assert.equal(stored?.payload.action, 'signature');
});

test('UNTC status snapshots are content-sensitive but polling time is provenance only', async () => {
  const html = await readFile(fixture('untc-genocide-status.html'), 'utf8');
  const first = parseUntcGenocidePage(html, '2026-09-08T00:00:00.000Z');
  const second = parseUntcGenocidePage(html, '2026-09-08T01:00:00.000Z');

  const scrub = (value: ReturnType<typeof parseUntcGenocidePage>) => ({
    ...value,
    treaty_actions: value.treaty_actions.map((item) => ({
      ...item,
      source: { ...item.source, retrieved_at: '<provenance-time>' },
    })),
  });

  assert.deepEqual(scrub(first), scrub(second));
});
