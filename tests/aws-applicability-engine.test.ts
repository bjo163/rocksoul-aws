import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { MemoryProvider } from '../packages/persistence/src/memory.js';
import { AwsLegalStore } from '../packages/orchestrator/src/aws/legal-store.js';
import {
  deriveAwsJurisdictionDimension,
  deriveAwsTreatyPartyDimension,
  evaluateAwsApplicability,
  type AwsApplicabilityDimensions,
} from '../packages/orchestrator/src/aws/applicability-engine.js';
import type { AwsTreatyActionCandidate } from '../packages/orchestrator/src/aws/treaty-actions.js';

const applies = (reason: string) => ({ status: 'APPLIES' as const, reasons: [reason], basis_refs: [] });
const uncertain = (reason: string) => ({ status: 'UNCERTAIN' as const, reasons: [reason], basis_refs: [] });
const partial = (reason: string) => ({ status: 'PARTIAL' as const, reasons: [reason], basis_refs: [] });
const fails = (reason: string) => ({ status: 'DOES_NOT_APPLY' as const, reasons: [reason], basis_refs: [] });

function dimensions(overrides: Partial<AwsApplicabilityDimensions> = {}): AwsApplicabilityDimensions {
  return {
    temporal: applies('temporal'),
    territorial: applies('territorial'),
    personal: applies('personal'),
    subject_matter: applies('subject matter'),
    jurisdiction: applies('jurisdiction'),
    ...overrides,
  };
}

test('five-dimension evaluator is deterministic and conservative', () => {
  assert.equal(evaluateAwsApplicability(dimensions()), 'APPLICABLE');
  assert.equal(
    evaluateAwsApplicability(dimensions({ temporal: fails('too early') })),
    'NOT_APPLICABLE',
  );
  assert.equal(
    evaluateAwsApplicability(dimensions({ personal: partial('partial actor scope') })),
    'PARTIALLY_APPLICABLE',
  );
  assert.equal(
    evaluateAwsApplicability(dimensions({ jurisdiction: uncertain('not resolved') })),
    'UNCERTAIN',
  );
  assert.equal(
    evaluateAwsApplicability(
      dimensions({
        personal: partial('partial actor scope'),
        jurisdiction: uncertain('not resolved'),
      }),
    ),
    'UNCERTAIN',
  );
});

test('signature alone never becomes binding treaty participation', () => {
  const action: AwsTreatyActionCandidate = {
    instrument_ref: 'LAW-X',
    actor_ref: 'state-name:EXAMPLE',
    actor_name: 'Example',
    action: 'signature',
    action_date: '2000-01-01',
    effective_date: null,
    source: {
      url: 'https://example.invalid',
      retrieved_at: '2026-09-08T00:00:00Z',
      depositary_notification_id: null,
      sha256: null,
    },
    research_state: 'CROSS_CHECKED',
  };

  const result = deriveAwsTreatyPartyDimension({
    actorRef: 'state-name:EXAMPLE',
    instrumentRef: 'LAW-X',
    asOfDate: '2001-01-01',
    actions: [action],
  });

  assert.equal(result.status, 'DOES_NOT_APPLY');
  assert.match(result.reasons[0], /signature alone/i);
});

test('missing treaty participation remains uncertain rather than prohibited', () => {
  const result = deriveAwsTreatyPartyDimension({
    actorRef: 'state-name:MISSING',
    instrumentRef: 'LAW-X',
    asOfDate: '2001-01-01',
    actions: [],
  });
  assert.equal(result.status, 'UNCERTAIN');
});

test('court presence and a treaty citation do not establish jurisdiction by themselves', () => {
  const missingConsent = deriveAwsJurisdictionDimension({
    forumRef: 'JUR-ICJ',
    jurisdictionBasisRefs: ['LAW-UN-GENOCIDE-1948'],
    consentStatus: 'UNKNOWN',
  });
  assert.equal(missingConsent.status, 'UNCERTAIN');

  const reservationConflict = deriveAwsJurisdictionDimension({
    forumRef: 'JUR-ICJ',
    jurisdictionBasisRefs: ['LAW-UN-GENOCIDE-1948'],
    consentStatus: 'CONTESTED',
    reservationConflict: true,
  });
  assert.equal(reservationConflict.status, 'UNCERTAIN');
});

test('authoritative jurisdiction resolution can resolve a reservation conflict', () => {
  const result = deriveAwsJurisdictionDimension({
    forumRef: 'JUR-ICJ',
    jurisdictionBasisRefs: ['LAW-UN-GENOCIDE-1948'],
    consentStatus: 'CONTESTED',
    reservationConflict: true,
    authoritativeResolution: 'AFFIRMED',
    authorityRefs: ['AUTH-ICJ-91-JUDGMENT-2007-02-26'],
  });

  assert.equal(result.status, 'APPLIES');
  assert.ok(result.basis_refs?.includes('AUTH-ICJ-91-JUDGMENT-2007-02-26'));
});

test('Bosnia v Serbia canonical applicability matches the pure engine', async () => {
  const file = path.join(
    process.cwd(),
    'data',
    'aws',
    'applicability',
    'APPL-BOSNIA-SERBIA-GENOCIDE-ICJ.json',
  );
  const record = JSON.parse(await readFile(file, 'utf8')) as {
    dimensions: AwsApplicabilityDimensions;
    overall: string;
  };

  assert.equal(evaluateAwsApplicability(record.dimensions), 'APPLICABLE');
  assert.equal(record.overall, 'APPLICABLE');
});

test('source dependency traversal includes AWS legal cases', async () => {
  const persistence = new MemoryProvider();
  const legal = new AwsLegalStore(persistence);

  await legal.upsertRecord('SOURCE', 'SRC-AWS-ICJ', {});
  await legal.upsertRecord('AUTHORITY', 'AUTH-X', {});
  await legal.upsertRecord('LEGAL_CASE', 'LCASE-X', {});

  await legal.linkDependency('AUTH-X', 'SRC-AWS-ICJ');
  await legal.linkDependency('LCASE-X', 'AUTH-X');

  assert.deepEqual(await legal.findDependentCases('SRC-AWS-ICJ'), ['LCASE-X']);
});
