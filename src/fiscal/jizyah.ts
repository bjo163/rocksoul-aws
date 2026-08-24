import { runtimeDataset } from '../persistence/runtime-data.js';

type JizyahRule = { classification?: string; modernApplicability?: string; [key: string]: unknown };
type FiscalRules = { jizyah?: Record<string, JizyahRule> };
export interface JizyahAssessmentInput { sourceProfile?: string; jurisdiction?: string; historicalContext?: unknown; personProfile?: Record<string, unknown>; }

const getRules = (): FiscalRules => (runtimeDataset('data/fiscal/rules.json') as FiscalRules | null) ?? {};

export function assessJizyah({ sourceProfile = 'Q9_29_JIZYAH', jurisdiction = 'SCRIPTURAL', historicalContext = null, personProfile = {} }: JizyahAssessmentInput = {}) {
  const cfg = getRules().jizyah?.DEFAULT;
  if (!cfg) {
    return { status: 'RULE_SET_REQUIRED' as const, jurisdiction, sourceProfile, historicalContext, personProfile };
  }
  return {
    status: 'HISTORICAL_SCRIPTURAL_ANALYSIS' as const,
    jurisdiction,
    sourceProfile,
    classification: cfg.classification,
    modernApplicability: cfg.modernApplicability,
    historicalContext,
    personProfile,
    rate: null,
    eligibility: null,
    exemptions: null,
    note: 'Jizyah is not automatically converted into a modern universal tax. Eligibility, rate, exemptions, enforcement, and historical context require an explicit source-scoped profile.',
  };
}
