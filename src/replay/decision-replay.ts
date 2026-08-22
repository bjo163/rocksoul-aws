// @ts-nocheck
export function replayDecision({input, analyze, historicalResult=null}={}) {
  if (typeof analyze !== 'function') throw new Error('analyze function is required');
  const currentResult = analyze(input);
  const before = historicalResult ?? null;
  return {
    input,
    before,
    after: currentResult,
    changed: before ? JSON.stringify(before) !== JSON.stringify(currentResult) : false,
    diff: before ? buildDiff(before, currentResult) : []
  };
}
function buildDiff(a,b,path='') {
  const diffs=[];
  const keys = new Set([...Object.keys(a ?? {}), ...Object.keys(b ?? {})]);
  for (const k of keys) {
    const p = path ? `${path}.${k}` : k;
    const av=a?.[k], bv=b?.[k];
    if (JSON.stringify(av) !== JSON.stringify(bv)) diffs.push({path:p,before:av,after:bv});
  }
  return diffs;
}
