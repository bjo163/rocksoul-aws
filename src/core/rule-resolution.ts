// @ts-nocheck
import fs from 'node:fs';
export function loadRules(file) { return JSON.parse(fs.readFileSync(file,'utf8')); }
export function resolveRule(rules, {jurisdiction, asOf = new Date().toISOString(), category, key}) {
  const t = new Date(asOf).getTime();
  const matches = rules.filter(r => (!jurisdiction || r.jurisdiction === jurisdiction || r.jurisdiction === 'GLOBAL')
    && (!category || r.category === category)
    && (!key || r.key === key)
    && new Date(r.effectiveFrom || '1900-01-01').getTime() <= t
    && (!r.effectiveTo || t <= new Date(r.effectiveTo).getTime())
    && r.status !== 'REPEALED');
  matches.sort((a,b) => (b.priority||0)-(a.priority||0) || new Date(b.effectiveFrom||0)-new Date(a.effectiveFrom||0));
  return matches[0] || null;
}
