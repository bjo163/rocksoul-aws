export interface RuleRecord {
  jurisdiction?: string;
  category?: string;
  key?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  priority?: number;
  status?: string;
  [key: string]: unknown;
}

export interface RuleResolutionOptions {
  jurisdiction?: string;
  asOf?: string;
  category?: string;
  key?: string;
}

export function resolveRule<T extends RuleRecord>(rules: T[], {
  jurisdiction,
  asOf = new Date().toISOString(),
  category,
  key,
}: RuleResolutionOptions = {}): T | null {
  const timestamp = new Date(asOf).getTime();
  const matches = rules.filter((rule) =>
    (!jurisdiction || rule.jurisdiction === jurisdiction || rule.jurisdiction === 'GLOBAL') &&
    (!category || rule.category === category) &&
    (!key || rule.key === key) &&
    new Date(rule.effectiveFrom ?? '1900-01-01').getTime() <= timestamp &&
    (!rule.effectiveTo || timestamp <= new Date(rule.effectiveTo).getTime()) &&
    rule.status !== 'REPEALED',
  );
  matches.sort((a, b) =>
    (b.priority ?? 0) - (a.priority ?? 0) ||
    new Date(b.effectiveFrom ?? 0).getTime() - new Date(a.effectiveFrom ?? 0).getTime(),
  );
  return matches[0] ?? null;
}
