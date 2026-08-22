// @ts-nocheck
export function versionedRule({ruleId, effectiveFrom, effectiveTo=null, version, authority, supersedes=null}) {
  return { ruleId, effectiveFrom, effectiveTo, version, authority, supersedes };
}

export function isActiveRule(rule, at) {
  const t = new Date(at).getTime();
  const from = new Date(rule.effectiveFrom).getTime();
  const to = rule.effectiveTo ? new Date(rule.effectiveTo).getTime() : Infinity;
  return t >= from && t < to;
}
