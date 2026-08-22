// @ts-nocheck
import { analyzeLaw } from './legal-analyzer.js';
import { createCase, policeReview, prosecutorReview, defenseReview, courtVerdict } from './justice-workflow.js';

const text = process.argv.slice(2).join(' ') || 'merokok';
const jurisdiction = process.env.JURISDICTION || 'ID';
const result = analyzeLaw({text, jurisdiction, sourceProfile:'CURRENT_ID_PLUS_MORAL'});
console.log(JSON.stringify(result,null,2));
const c=createCase({jurisdiction,allegation:text});
policeReview(c); prosecutorReview(c,{charge:result.action}); defenseReview(c); courtVerdict(c,{verdict:'UNRESOLVED',findings:['Not a real legal verdict. Evidence, counsel and the competent court are required.']});
console.log('\n--- JUSTICE WORKFLOW MODEL ---'); console.log(JSON.stringify(c,null,2));
