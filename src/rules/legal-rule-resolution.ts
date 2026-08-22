// @ts-nocheck
import fs from 'node:fs';
export function resolveLegalRule({file, jurisdiction, key, asOf=new Date().toISOString(), context={}}={}){
 const parsed=JSON.parse(fs.readFileSync(file,'utf8')); const rules=parsed.rules||parsed; const t=new Date(asOf).getTime();
 return rules.filter(r=>(!jurisdiction||r.jurisdiction===jurisdiction||r.jurisdiction==='GLOBAL')&&(!key||r.key===key)&&new Date(r.effectiveFrom||0).getTime()<=t&&(!r.effectiveTo||t<=new Date(r.effectiveTo).getTime())).sort((a,b)=>(b.priority||0)-(a.priority||0))[0]||null;
}
