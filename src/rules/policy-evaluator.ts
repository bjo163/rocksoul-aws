// @ts-nocheck
export function evaluatePolicy({policyId, indicators={}, thresholds={}}={}){
 const breaches=Object.entries(thresholds).filter(([k,v])=>(indicators[k]??0)>v).map(([k,v])=>({indicator:k,threshold:v,actual:indicators[k]}));
 return {policyId,status:breaches.length?'ATTENTION':'OK',breaches,evaluatedAt:new Date().toISOString()};
}
