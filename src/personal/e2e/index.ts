// @ts-nocheck
export function buildPersonalLifecycle({rid,steps=[]}={}) {
  const expected=['IDENTITY','RELATION','HEALTH','EDUCATION','EMPLOYMENT','INCOME','WEALTH','ASSET','TAX','ZAKAT','KNOWLEDGE','CAB','VERIFICATION','SHADOW','SCENARIO','PROJECT','EVENT','ASMA','MIZAN','XP','AUDIT'];
  const seen=new Set(steps.map(s=>typeof s==='string'?s:s.type));
  const missing=expected.filter(x=>!seen.has(x));
  return {rid,expected,missing,complete:missing.length===0};
}
