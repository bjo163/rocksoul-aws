// @ts-nocheck
import fs from 'node:fs';
import path from 'node:path';
import { createVerificationCase, loadSourceCatalog, verifyCase, createClarificationDraft } from './index.js';

const rawArgs = process.argv.slice(2);
const refArg = rawArgs.find(a => a.startsWith('--ref='));
const args = rawArgs.filter(a => !a.startsWith('--ref='));
const claimText = args.join(' ') || 'Example claim';
const catalogPath = path.resolve('data/scripture-sources.json');
const catalog = fs.existsSync(catalogPath) ? loadSourceCatalog(catalogPath) : [];
const ref = refArg ? refArg.slice(6) : null;
const sourceType = ref?.startsWith('Q') ? 'SCRIPTURE' : 'USER_PROVIDED';
const record = createVerificationCase({
  title: 'CLI verification',
  claimantId: 'RID-LOCAL',
  claimText,
  claimedReference: ref,
  sourceType,
  targetPublication: true
});
const result = verifyCase(record, { catalog });
const draft = createClarificationDraft({ verificationCase: result });
console.log(JSON.stringify({verification: result, clarificationDraft: draft}, null, 2));
