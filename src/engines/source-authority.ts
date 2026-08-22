// @ts-nocheck
import { scriptureSourcePolicy, normativeSourceGuard } from '../revelation/scripture-source-policy.js';
const LEVELS=['REVELATION_PRIMARY_QURAN','REVELATION_REFERENCE_TAWRAT','REVELATION_REFERENCE_ZABUR','REVELATION_REFERENCE_INJIL','TEXTUAL_WITNESS','HUMAN_INFERENCE','SOFTWARE_ASSUMPTION'];
export function sourceAuthorityProfile(items=[]){
  const policy=scriptureSourcePolicy();
  return items.map(x=>{
    const guard=normativeSourceGuard({book:x.book ?? x.canonicalName,sourceClass:x.sourceClass});
    return {
      ...x,
      authorityLevel:LEVELS.includes(x.authorityLevel)?x.authorityLevel:'SOFTWARE_ASSUMPTION',
      normativeAllowed:guard.allowed,
      normativeReason:guard.reason,
      sourcePolicy:policy.mode
    };
  });
}
