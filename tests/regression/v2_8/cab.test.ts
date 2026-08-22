// @ts-nocheck
import assert from 'node:assert/strict';
import { createCab, createChangeRequest, cabRelations, knowledgeWorkflow, clarifyClaim } from '../../../src/cab/index.js';

const cab = createCab({
  title: 'Clarify and publish a knowledge note',
  requesterId: 'RID-001',
  type: 'KNOWLEDGE.CLARIFICATION',
  sourceType: 'PERSONAL_INTUITION',
  visibility: 'PRIVATE'
});

const cr = createChangeRequest({
  cabId: cab.cabId,
  requestedBy: cab.requesterId,
  title: 'Clarify claim before social publication',
  affectedTypes: ['MEDIA.CLAIM', 'KNOWLEDGE.DOCUMENT'],
  affectedEntityIds: ['RID-001'],
  affectedRuleIds: ['SOURCE.PROVENANCE'],
  evidenceIds: ['EVID-001'],
  sourceRefs: ['QURAN:3:49'],
  projectIds: ['PROJECT-KNOWLEDGE-001'],
  perspectives: { R: 'verify facts', G: 'check sources', B: 'check fairness', L: 'provide useful clarification' }
});

const rels = cabRelations({
  cabId: cab.cabId,
  changeRequestId: cr.changeRequestId,
  requesterId: cab.requesterId,
  projectIds: ['PROJECT-KNOWLEDGE-001'],
  evidenceIds: ['EVID-001'],
  sourceRefs: ['QURAN:3:49'],
  affectedEntityIds: ['RID-001'],
  affectedRuleIds: ['SOURCE.PROVENANCE']
});

const wf = knowledgeWorkflow({ cab, changeRequest: cr });
const clarification = clarifyClaim({ cabId: cab.cabId, claimText: 'A claim to be clarified', sourceIds: ['QURAN:3:49'] });

assert.equal(cab.type, 'KNOWLEDGE.CLARIFICATION');
assert.equal(cr.projectIds[0], 'PROJECT-KNOWLEDGE-001');
assert.ok(rels.some(r => r.type === 'AFFECTS_PROJECT'));
assert.ok(rels.some(r => r.type === 'IMPLEMENTS_INTO_PROJECT'));
assert.equal(wf.kind, 'KNOWLEDGE.SHARE');
assert.equal(clarification.status, 'OPEN');
console.log('PASS: CAB / knowledge / project integration');
