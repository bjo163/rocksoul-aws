// @ts-nocheck
export function detectRuleConflicts(rules=[]){const groups=new Map();for(const r of rules){const k=`${r.jurisdiction||'*'}|${r.subject||'*'}|${r.validFrom||''}|${r.validTo||''}`;if(!groups.has(k))groups.set(k,[]);groups.get(k).push(r)}return[...groups.values()].filter(g=>new Set(g.map(x=>x.effect)).size>1).map(rules=>({type:'CONFLICT',rules}));}
export function resolveByAuthority(rules=[]){const rank={REVELATION:100,CONSTITUTION:90,STATUTE:80,REGULATION:70,POLICY:60,MODEL:10};return[...rules].sort((a,b)=>(rank[b.authorityType]??0)-(rank[a.authorityType]??0))[0]??null;}
