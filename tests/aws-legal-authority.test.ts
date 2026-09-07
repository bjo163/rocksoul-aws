import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { MemoryProvider } from '../packages/persistence/src/memory.js';
import { AwsLegalStore } from '../packages/orchestrator/src/aws/legal-store.js';
import {
  parseIcjBosniaSerbiaCasePage,
  parseIcjBosniaSerbiaJudgmentPage,
} from '../packages/orchestrator/src/aws/icj-adapter.js';
import {
  createAwsAuthorityId,
  persistAwsAuthorityCandidate,
} from '../packages/orchestrator/src/aws/legal-authorities.js';
import { parseUntcGenocideLegalNotices } from '../packages/orchestrator/src/aws/untc-legal-notices.js';
import { createAwsTreatyActionId } from '../packages/orchestrator/src/aws/treaty-actions.js';

const fixture = (name: string) =>
  path.join(process.cwd(), 'tests', 'fixtures', 'aws', name);

test('ICJ case 91 fixture normalizes case identity and Article IX basis', async () => {
  const html = await readFile(fixture('icj-case-91.html'), 'utf8');
  const payload = parseIcjBosniaSerbiaCasePage(html);

  assert.equal(payload.case_number, 91);
  assert.equal(payload.legal_case_id, 'LCASE-ICJ-BOSNIA-SERBIA-91');
  assert.equal(payload.application_date, '1993-03-20');
  assert.equal(payload.jurisdiction_basis, 'Article IX of the Genocide Convention');
  assert.equal(payload.forum_ref, 'JUR-ICJ');
});

test('ICJ judgment fixture becomes a canonical judicial authority', async () => {
  const html = await readFile(fixture('icj-judgment-91.html'), 'utf8');
  const payload = parseIcjBosniaSerbiaJudgmentPage(html);
  const authority = payload.authority;

  assert.equal(authority.authority_type, 'JUDGMENT');
  assert.equal(authority.date, '2007-02-26');
  assert.equal(authority.document_number, '091-20070226-JUD-01-00-EN');
  assert.equal(authority.case_ref, 'LCASE-ICJ-BOSNIA-SERBIA-91');
  assert.ok(authority.holding_summary.some((item) => item.includes('affirmed jurisdiction')));
  assert.ok(authority.holding_summary.some((item) => item.includes('not committed genocide')));
  assert.ok(authority.holding_summary.some((item) => item.includes('prevent genocide in Srebrenica')));

  const id1 = createAwsAuthorityId(authority);
  const id2 = createAwsAuthorityId({ ...authority });
  assert.equal(id1, id2);

  const persistence = new MemoryProvider();
  const legal = new AwsLegalStore(persistence);
  await legal.upsertRecord('SOURCE', 'SRC-AWS-ICJ', {});
  await legal.upsertRecord('LEGAL_CASE', 'LCASE-ICJ-BOSNIA-SERBIA-91', {});
  const persisted = await persistAwsAuthorityCandidate(
    legal,
    authority,
    'AUTH-ICJ-91-JUDGMENT-2007-02-26',
  );
  assert.equal(persisted.id, 'AUTH-ICJ-91-JUDGMENT-2007-02-26');
  assert.equal((await legal.getRecord(persisted.id))?.kind, 'AUTHORITY');
});

test('UNTC legal notices preserve reservation, declaration, objection and withdrawal separately', async () => {
  const html = await readFile(fixture('untc-genocide-notices.html'), 'utf8');
  const notices = parseUntcGenocideLegalNotices(
    html,
    '2026-09-08T00:00:00.000Z',
    'https://treaties.un.org/Pages/ViewDetails.aspx?chapter=4&mtdsg_no=IV-1&src=TREATY',
  );

  const kinds = notices.map((item) => item.action);
  assert.ok(kinds.includes('declaration'));
  assert.ok(kinds.includes('reservation'));
  assert.ok(kinds.includes('objection'));
  assert.ok(kinds.includes('withdrawal'));

  const serbia = notices.find(
    (item) => item.actor_name === 'Serbia' && item.action === 'reservation',
  );
  assert.ok(serbia);
  assert.equal(serbia.action_date, '2001-03-12');

  const bosnia = notices.find(
    (item) => item.actor_name === 'Bosnia and Herzegovina' && item.action === 'objection',
  );
  assert.ok(bosnia);
  assert.equal(bosnia.action_date, '2001-12-27');

  const spain = notices.find(
    (item) => item.actor_name === 'Spain' && item.action === 'withdrawal',
  );
  assert.ok(spain);
  assert.equal(spain.action_date, '2009-09-24');

  const id1 = createAwsTreatyActionId(spain);
  const id2 = createAwsTreatyActionId({ ...spain, source: { ...spain.source, retrieved_at: '2026-09-09T00:00:00.000Z' } });
  assert.equal(id1, id2);
});
