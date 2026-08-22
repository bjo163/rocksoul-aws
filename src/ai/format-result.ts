type Loose = Record<string, any>;
export function formatLawResult(r: Loose): string {
  const action=r?.domainAnalysis?.classification?.action ?? r?.candidateActions?.[0]?.action ?? r?.intent ?? 'UNRESOLVED';
  const m=r?.mizan;
  const q=r?.quranicMizan;
  const semantic=m?.semantic ?? r?.domainAnalysis?.semantic?.vector ?? {R:0,G:0,B:0,L:0};
  return [
    `ACTION: ${action}`,
    `EPISTEMIC STATUS: ${q?.status ?? 'UNRESOLVED'}`,
    `CONFIDENCE: ${Number(r?.confidence?.score ?? 0).toFixed(3)}`,
    `R/G/B/L: ${Object.entries(semantic).map(([k,v])=>`${k}=${v}`).join('  ')}`,
    `MIZAN ANALYTICAL SCORE: ${m?.score ?? 'UNRESOLVED'}`,
    `REVELATION POLICY: ${r?.revelationPolicy?.mode ?? 'FOUR_BOOKS_ONLY'}`,
    'ASMA AUTHORITY: PURE_REVELATION_ASMA_ENGINE',
    `BOUNDARY: ${q?.divineVerdict===false?'Analytical result only; final Divine judgement is not computed.':'Model-only decision support.'}`
  ].join('\n');
}
