import { runtimeDataset } from '../persistence/runtime-data.js';

type FiscalRule = { authority?: string; [key: string]: unknown };
type FiscalRules = { tax?: Record<string, FiscalRule> };
export interface TaxAssessmentInput { jurisdiction?: string; taxYear?: number | string; taxType?: string; grossAmount?: number; deductions?: number; zakatPaid?: number; }
export interface TaxAssessment {
  status: 'JURISDICTION_REQUIRED' | 'RULE_SET_REQUIRED_FOR_RATE';
  jurisdiction: string;
  taxYear?: number | string;
  taxType?: string;
  grossAmount?: number;
  deductions?: number;
  zakatPaid?: number;
  taxableBase: number | null;
  sourceAuthority?: string;
  note?: string;
}

const getRules = (): FiscalRules => {
  const dataset = runtimeDataset('data/fiscal/rules.json') as { tax?: Record<string, FiscalRule> } | null;
  return dataset ?? {};
};

export function assessTax(input: TaxAssessmentInput = {}): TaxAssessment {
  const jurisdiction = input.jurisdiction ?? 'UNSPECIFIED';
  const taxYear = input.taxYear;
  const taxType = input.taxType;
  const grossAmount = Number(input.grossAmount ?? 0);
  const deductions = Number(input.deductions ?? 0);
  const zakatPaid = Number(input.zakatPaid ?? 0);
  const cfg = getRules().tax?.[jurisdiction];
  if (!cfg) return { status: 'JURISDICTION_REQUIRED', jurisdiction, taxYear, taxType, taxableBase: null };
  const base = Math.max(0, grossAmount - deductions);
  return {
    status: 'RULE_SET_REQUIRED_FOR_RATE', jurisdiction, taxYear, taxType,
    grossAmount, deductions, zakatPaid, taxableBase: base,
    sourceAuthority: typeof cfg.authority === 'string' ? cfg.authority : undefined,
    note: 'No rate is inferred. Supply a current official tax-year rule set before calculating liability.',
  };
}
