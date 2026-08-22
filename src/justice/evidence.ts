// @ts-nocheck
import crypto from 'node:crypto';
export function createEvidence({type='UNKNOWN',source='UNKNOWN',content='',confidence=0.0}={}){
  const id=`EVID_${crypto.randomUUID()}`;
  const hash=crypto.createHash('sha256').update(JSON.stringify({type,source,content})).digest('hex');
  return {evidenceId:id,type,source,confidence:Math.max(0,Math.min(1,confidence)),hash,chainOfCustody:[]};
}
export function addCustody(evidence,{actor,event,at=new Date().toISOString()}={}){evidence.chainOfCustody.push({actor,event,at}); return evidence;}
