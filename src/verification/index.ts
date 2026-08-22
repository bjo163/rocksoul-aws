// @ts-nocheck
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const STATUS = Object.freeze([
  'UNVERIFIED','SOURCE_FOUND','TEXT_MATCHED','CONTEXT_CHECKED','TRANSLATION_CHECKED','AUTHENTICITY_REVIEWED',
  'VERIFIED','SUPPORTED','PARTIALLY_VERIFIED','MISQUOTED','OUT_OF_CONTEXT','TRANSLATION_VARIANCE',
  'DISPUTED','FALSE_ATTRIBUTION','UNVERIFIABLE','NEEDS_SOURCE','REVIEW_REQUIRED'
]);

const SOURCE_TYPES = Object.freeze([
  'SCRIPTURE','HADITH','HISTORICAL_TEXT','MANUSCRIPT','EDITION','TRANSLATION','COMMENTARY','SECONDARY_SOURCE','SOCIAL_MEDIA','USER_PROVIDED'
]);

const normalize = (value='') => String(value)
  .normalize('NFKC')
  .replace(/[\u0640]/g,'')
  .replace(/\s+/g,' ')
  .trim();

const digest = (value) => crypto.createHash('sha256').update(normalize(value)).digest('hex');

export function createVerificationCase({
  title,
  claimantId,
  claimText,
  claimedSource=null,
  claimedReference=null,
  claimedAuthor=null,
  foundAt=null,
  visibility='PRIVATE',
  sourceType='USER_PROVIDED',
  targetPublication=false,
  metadata={}
}={}) {
  if (!title || !claimantId || !claimText) throw new Error('title, claimantId and claimText are required');
  if (!SOURCE_TYPES.includes(sourceType)) throw new Error(`Unsupported verification sourceType: ${sourceType}`);
  const id = `VC_${crypto.randomUUID()}`;
  return {
    verificationCaseId:id,
    title,
    claimantId,
    claimText:normalize(claimText),
    claimHash:digest(claimText),
    claimedSource,
    claimedReference,
    claimedAuthor,
    foundAt,
    visibility,
    sourceType,
    targetPublication,
    status:'UNVERIFIED',
    checks:{source:'PENDING',text:'PENDING',attribution:'PENDING',context:'PENDING',translation:'PENDING'},
    evidenceIds:[],
    sourceRecords:[],
    reviewNotes:[],
    metadata,
    createdAt:new Date().toISOString(),
    updatedAt:new Date().toISOString()
  };
}

export function loadSourceCatalog(filePath) {
  const raw=fs.readFileSync(filePath,'utf8');
  const data=JSON.parse(raw);
  return Array.isArray(data) ? data : (data.sources ?? []);
}

export function buildCatalogIndex(records=[]) {
  return new Map(records.map(r=>[String(r.id),r]));
}

export function checkSource(caseRecord, catalogIndex) {
  const ref=caseRecord.claimedReference || caseRecord.claimedSource;
  if (!ref) return {status:'NEEDS_SOURCE', matched:null, reason:'No source/reference supplied'};
  const record=catalogIndex.get(String(ref));
  if (!record) return {status:'UNVERIFIABLE', matched:null, reason:'Reference is not present in the configured source catalog'};
  return {status:'SOURCE_FOUND', matched:record, reason:'Reference exists in configured source catalog'};
}

export function checkText(caseRecord, matchedRecord) {
  if (!matchedRecord) return {status:'UNVERIFIABLE', exactMatch:null, similarity:0, reason:'No canonical text record is configured'};
  const canonical = matchedRecord.text ?? matchedRecord.quote ?? matchedRecord.excerpt ?? matchedRecord.note ?? '';
  if (!canonical) return {status:'UNVERIFIABLE', exactMatch:null, similarity:0, reason:'Catalog record has metadata but no canonical text'};
  const claim=normalize(caseRecord.claimText);
  const source=normalize(canonical);
  if (claim === source) return {status:'TEXT_MATCHED', exactMatch:true, similarity:1, reason:'Exact normalized text match'};
  if (claim.includes(source) || source.includes(claim)) return {status:'TEXT_MATCHED', exactMatch:false, similarity:0.95, reason:'Containment match; manual context review recommended'};
  return {status:'REVIEW_REQUIRED', exactMatch:false, similarity:0, reason:'No canonical text match'};
}

export function checkAttribution(caseRecord, matchedRecord) {
  if (!matchedRecord) return {status:'UNVERIFIABLE', match:null, reason:'No source record'};
  const expected=matchedRecord.author ?? matchedRecord.attributedTo ?? matchedRecord.name ?? null;
  if (!caseRecord.claimedAuthor && !expected) return {status:'REVIEW_REQUIRED', match:null, reason:'Attribution unavailable'};
  if (!caseRecord.claimedAuthor || !expected) return {status:'REVIEW_REQUIRED', match:false, reason:'Attribution incomplete'};
  const match=normalize(caseRecord.claimedAuthor).toLowerCase() === normalize(expected).toLowerCase();
  return {status:match?'AUTHENTICITY_REVIEWED':'FALSE_ATTRIBUTION', match, reason:match?'Attribution agrees with configured source metadata':'Claimed author differs from configured source metadata'};
}

export function checkContext(caseRecord, matchedRecord, {contextNote=null}={}) {
  if (!matchedRecord) return {status:'UNVERIFIABLE', result:null, reason:'No source record'};
  const hasContext=Boolean(contextNote || matchedRecord.context || matchedRecord.note);
  return {status:hasContext?'CONTEXT_CHECKED':'REVIEW_REQUIRED', result:hasContext?'REVIEW_CONTEXT_REQUIRED':'NO_CONTEXT_DATA', reason:hasContext?'Context metadata exists; this engine does not infer theology automatically':'No context metadata configured'};
}

export function checkTranslation(caseRecord, matchedRecord, {originalText=null, translatedText=null}={}) {
  if (!translatedText && !originalText) return {status:'REVIEW_REQUIRED', result:null, reason:'No original/translation pair provided'};
  if (originalText && translatedText && normalize(originalText) === normalize(translatedText)) return {status:'TRANSLATION_VARIANCE', result:'same-text', reason:'Translation input equals original input; verify language labels'};
  return {status:'TRANSLATION_CHECKED', result:'MANUAL_REVIEW', reason:'Translation pair supplied; semantic review remains source-dependent'};
}

export function classifyVerification(checks) {
  if (checks.source === 'NEEDS_SOURCE') return {status:'NEEDS_SOURCE', confidence:0.05};
  if (checks.source === 'UNVERIFIABLE') return {status:'UNVERIFIABLE', confidence:0.15};
  if (checks.attribution === 'FALSE_ATTRIBUTION') return {status:'FALSE_ATTRIBUTION', confidence:0.9};
  if (checks.text === 'TEXT_MATCHED' && ['CONTEXT_CHECKED','REVIEW_REQUIRED'].includes(checks.context)) return {status:'PARTIALLY_VERIFIED', confidence:0.75};
  if (checks.text === 'TEXT_MATCHED' && checks.context === 'CONTEXT_CHECKED' && ['TRANSLATION_CHECKED','REVIEW_REQUIRED'].includes(checks.translation)) return {status:'VERIFIED', confidence:0.88};
  return {status:'REVIEW_REQUIRED', confidence:0.4};
}

export function verifyCase(caseRecord, {catalog=[], contextNote=null, originalText=null, translatedText=null}={}) {
  const index=buildCatalogIndex(catalog);
  const source=checkSource(caseRecord,index);
  const text=checkText(caseRecord,source.matched);
  const attribution=checkAttribution(caseRecord,source.matched);
  const context=checkContext(caseRecord,source.matched,{contextNote});
  const translation=checkTranslation(caseRecord,source.matched,{originalText,translatedText});
  const checks={source:source.status,text:text.status,attribution:attribution.status,context:context.status,translation:translation.status};
  const classification=classifyVerification(checks);
  return {
    ...caseRecord,
    status:classification.status,
    verification:{checks,confidence:classification.confidence,source,text,attribution,context,translation},
    verifiedAt:new Date().toISOString(),
    updatedAt:new Date().toISOString()
  };
}

export function createClarificationDraft({verificationCase, audience='PUBLIC', tone='NEUTRAL'}={}) {
  if (!verificationCase?.verification) throw new Error('A verified verification case is required');
  const v=verificationCase.verification;
  const lines=[
    `CLAIM: ${verificationCase.claimText}`,
    `STATUS: ${verificationCase.status}`,
    `CONFIDENCE: ${Math.round(v.confidence*100)}%`,
    `SOURCE: ${verificationCase.claimedReference ?? verificationCase.claimedSource ?? 'Not supplied'}`,
    `NOTE: This result reflects the configured source catalog and review checks; it is not a universal divine verdict.`
  ];
  return {
    draftId:`KD_${crypto.randomUUID()}`,
    verificationCaseId:verificationCase.verificationCaseId,
    audience,
    tone,
    status:'DRAFT',
    text:lines.join('\n'),
    publication:{status:'PRIVATE',channels:[]},
    createdAt:new Date().toISOString()
  };
}

export const VERIFICATION_STATUSES = STATUS;
export const VERIFICATION_SOURCE_TYPES = SOURCE_TYPES;

