// @ts-nocheck
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createVerificationCase, verifyCase, createClarificationDraft } from '../../../src/verification/index.js';
import { createCab, createChangeRequest, verificationRelations } from '../../../src/cab/index.js';

const catalog = [
  { id: 'DEMO:1', text: 'Original canonical text', context: 'Canonical context', author: 'Source Author' },
  { id: 'Q3:49', domain: 'ISA_CONTEXT', note: 'Isa and signs; metadata only' }
];

const matched = createVerificationCase({
  title: 'Exact quote verification',
  claimantId: 'RID-001',
  claimText: 'Original canonical text',
  claimedReference: 'DEMO:1',
  claimedAuthor: 'Source Author',
  sourceType: 'USER_PROVIDED',
  targetPublication: true
});
const verified = verifyCase(matched, { catalog, contextNote: 'Canonical context' });
assert.equal(verified.verification.checks.source, 'SOURCE_FOUND');
assert.equal(verified.verification.checks.text, 'TEXT_MATCHED');
assert.equal(verified.verification.checks.attribution, 'AUTHENTICITY_REVIEWED');
assert.ok(['PARTIALLY_VERIFIED','VERIFIED'].includes(verified.status));
const draft = createClarificationDraft({ verificationCase: verified });
assert.equal(draft.publication.status, 'PRIVATE');

const missing = createVerificationCase({
  title: 'Unverified claim', claimantId: 'RID-001', claimText: 'A social-media quote', claimedReference: 'UNKNOWN:42'
});
const unresolved = verifyCase(missing, { catalog });
assert.equal(unresolved.status, 'UNVERIFIABLE');

const cab = createCab({ title: 'Verify before sharing', requesterId: 'RID-001', type: 'KNOWLEDGE.CLARIFICATION' });
const cr = createChangeRequest({ cabId: cab.cabId, requestedBy: 'RID-001', title: 'Verify claim', affectedTypes: ['VERIFICATION.CASE'] });
const rels = verificationRelations({ cabId: cab.cabId, verificationCaseId: verified.verificationCaseId, sourceRefs: ['DEMO:1'], knowledgeDraftId: draft.draftId, publicationId: 'POST-001' });
assert.ok(rels.some(r => r.type === 'VERIFIES'));
assert.ok(rels.some(r => r.type === 'MATCHES_SOURCE'));
assert.ok(rels.some(r => r.type === 'GENERATES_KNOWLEDGE'));
assert.ok(cr.changeRequestId.startsWith('CR_'));

console.log('PASS: verification / source / clarification / CAB integration');
