import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { MemoryProvider } from '../packages/persistence/src/memory.js';
import { AwsLegalStore } from '../packages/orchestrator/src/aws/legal-store.js';
import {
  evaluateAwsClaimAssessment,
  synthesizeAwsCase,
} from '../packages/orchestrator/src/aws/legal-assessment-engine.js';
import { AwsLegalAssessmentService } from '../packages/orchestrator/src/aws/legal-assessment-service.js';

test('claim assessment engine respects applicability before merits', () => {
  assert.equal(
    evaluateAwsClaimAssessment({
      applicability: 'NOT_APPLICABLE',
      supportingHoldingRefs: ['HOLD-X'],
      contradictingHoldingRefs: [],
    }),
    'NOT_REACHED',
  );

  assert.equal(
    evaluateAwsClaimAssessment({
      applicability: 'UNCERTAIN',
      supportingHoldingRefs: ['HOLD-X'],
      contradictingHoldingRefs: [],
    }),
    'UNRESOLVED',
  );

  assert.equal(
    evaluateAwsClaimAssessment({
      applicability: 'PARTIALLY_APPLICABLE',
      supportingHoldingRefs: ['HOLD-X'],
      contradictingHoldingRefs: [],
    }),
    'UNRESOLVED',
  );
});

test('claim assessment distinguishes support contradiction mixed and unresolved', () => {
  assert.equal(
    evaluateAwsClaimAssessment({
      applicability: 'APPLICABLE',
      supportingHoldingRefs: ['HOLD-S'],
      contradictingHoldingRefs: [],
    }),
    'SUPPORTED',
  );

  assert.equal(
    evaluateAwsClaimAssessment({
      applicability: 'APPLICABLE',
      supportingHoldingRefs: [],
      contradictingHoldingRefs: ['HOLD-C'],
    }),
    'CONTRADICTED',
  );

  assert.equal(
    evaluateAwsClaimAssessment({
      applicability: 'APPLICABLE',
      supportingHoldingRefs: ['HOLD-S'],
      contradictingHoldingRefs: ['HOLD-C'],
    }),
    'MIXED',
  );

  assert.equal(
    evaluateAwsClaimAssessment({
      applicability: 'APPLICABLE',
      supportingHoldingRefs: [],
      contradictingHoldingRefs: [],
    }),
    'UNRESOLVED',
  );
});

test('case synthesis preserves mixed holdings instead of inventing one verdict', () => {
  assert.equal(
    synthesizeAwsCase(['SUPPORTED', 'CONTRADICTED', 'SUPPORTED']),
    'MIXED_HOLDINGS',
  );
  assert.equal(
    synthesizeAwsCase(['SUPPORTED', 'SUPPORTED']),
    'CONSISTENT_SUPPORT',
  );
  assert.equal(
    synthesizeAwsCase(['CONTRADICTED', 'CONTRADICTED']),
    'CONSISTENT_CONTRADICTION',
  );
  assert.equal(
    synthesizeAwsCase(['SUPPORTED', 'UNRESOLVED']),
    'UNRESOLVED',
  );
  assert.equal(
    synthesizeAwsCase(['NOT_REACHED']),
    'UNRESOLVED',
  );
});

test('Bosnia v Serbia canonical claim assessments reproduce the deterministic synthesis', async () => {
  const root = path.join(process.cwd(), 'data', 'aws');
  const names = [
    'CASSMT-BOSNIA-SERBIA-JURISDICTION.json',
    'CASSMT-BOSNIA-SERBIA-COMMISSION.json',
    'CASSMT-BOSNIA-SERBIA-PREVENTION.json',
    'CASSMT-BOSNIA-SERBIA-COOPERATION.json',
  ];

  const assessments = [];
  for (const name of names) {
    assessments.push(
      JSON.parse(
        await readFile(path.join(root, 'claim_assessments', name), 'utf8'),
      ),
    );
  }

  const synthesis = JSON.parse(
    await readFile(
      path.join(root, 'case_syntheses', 'CSYN-BOSNIA-SERBIA-ICJ-91.json'),
      'utf8',
    ),
  );

  assert.deepEqual(
    assessments.map((item) => item.result),
    ['SUPPORTED', 'CONTRADICTED', 'SUPPORTED', 'SUPPORTED'],
  );
  assert.equal(
    synthesizeAwsCase(assessments.map((item) => item.result)),
    'MIXED_HOLDINGS',
  );
  assert.equal(synthesis.result, 'MIXED_HOLDINGS');
  assert.equal(synthesis.legal_result, 'UNRESOLVED');
  assert.equal(synthesis.mizan_status, 'NOT_RUN');
});

test('runtime assessment graph keeps authority impact connected to the legal case', async () => {
  const persistence = new MemoryProvider();
  const legal = new AwsLegalStore(persistence);
  const service = new AwsLegalAssessmentService(legal);

  await legal.upsertRecord('AUTHORITY', 'AUTH-X', {});
  await legal.upsertRecord('LEGAL_CASE', 'LCASE-X', {});
  await legal.upsertRecord('CLAIM', 'LCLAIM-X', {});
  await legal.upsertRecord('APPLICABILITY', 'APPL-X', { overall: 'APPLICABLE' });

  await service.persistHolding({
    id: 'HOLD-X',
    authority_ref: 'AUTH-X',
    case_ref: 'LCASE-X',
  });

  const assessment = await service.persistClaimAssessment({
    id: 'CASSMT-X',
    case_ref: 'LCASE-X',
    claim_ref: 'LCLAIM-X',
    applicability_ref: 'APPL-X',
    applicability: 'APPLICABLE',
    supporting_holding_refs: ['HOLD-X'],
    contradicting_holding_refs: [],
  });

  assert.equal(assessment.result, 'SUPPORTED');

  const synthesis = await service.persistCaseSynthesis(
    'CSYN-X',
    'LCASE-X',
    [assessment],
  );

  assert.equal(synthesis.result, 'CONSISTENT_SUPPORT');
  assert.equal(synthesis.legal_result, 'UNRESOLVED');
  assert.equal(synthesis.mizan_status, 'NOT_RUN');

  assert.deepEqual(await legal.findDependentCases('AUTH-X'), ['LCASE-X']);
});
