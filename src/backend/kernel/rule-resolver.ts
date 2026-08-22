// @ts-nocheck
export class UniversalRuleResolver {
  constructor({rules = []} = {}) { this.rules = [...rules]; }
  add(rule) { if (!rule?.ruleId) throw new Error('ruleId is required'); this.rules.push({...rule}); return rule; }
  resolve({jurisdiction = null, asOf = new Date().toISOString(), category = null, key = null, sourceTypes = null} = {}) {
    const t = new Date(asOf).getTime();
    const matches = this.rules.filter(r =>
      (!jurisdiction || r.jurisdiction === jurisdiction || r.jurisdiction === 'GLOBAL') &&
      (!category || r.category === category) &&
      (!key || r.key === key) &&
      (!sourceTypes || sourceTypes.includes(r.sourceType)) &&
      new Date(r.effectiveFrom ?? '1900-01-01').getTime() <= t &&
      (!r.effectiveTo || t <= new Date(r.effectiveTo).getTime()) &&
      r.status !== 'REPEALED'
    );
    matches.sort((a,b) => (b.priority ?? 0) - (a.priority ?? 0) || new Date(b.effectiveFrom ?? 0) - new Date(a.effectiveFrom ?? 0));
    const winner = matches[0] ?? null;
    return {winner, candidates: matches, perspective: winner?.perspective ?? null};
  }
  explain(context = {}) { const r = this.resolve(context); return {context, matched: Boolean(r.winner), winner:r.winner, candidates:r.candidates.map(x=>x.ruleId)}; }
}
