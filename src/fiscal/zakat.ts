import { runtimeDataset } from '../persistence/runtime-data.js';

type ZakatRules = { zakat?: Record<string, unknown> };
type Nisab2026 = { authority: string; income: { nisabMonthlyIdr: number; nisabAnnualIdr: number; rate: number }; gold: { nisabGrams: number; rate: number } };
export interface IncomeZakatInput { income?: number; year?: number; jurisdiction?: string; monthly?: boolean; }
export interface GoldZakatInput { grams?: number; goldValueIdrPerGram?: number; year?: number; jurisdiction?: string; haul?: boolean; }
export interface ZakatAssessmentInput extends IncomeZakatInput, GoldZakatInput { zakatType?: 'INCOME' | 'GOLD' | string; }

const getRules = (): ZakatRules => (runtimeDataset('data/fiscal/rules.json') as ZakatRules | null) ?? {};
const getNisab2026 = (): Nisab2026 => {
  const value = runtimeDataset('data/fiscal/nisab-2026-id.json') as Nisab2026 | null;
  if (!value?.income || !value.gold || typeof value.authority !== 'string') throw new Error('NISAB_RULESET_INVALID');
  return value;
};
const roundMoney = (n: number): number => Math.round(n * 100) / 100;

export function calcIncomeZakat({ income = 0, year = 2026, jurisdiction = 'ID', monthly = false }: IncomeZakatInput = {}) {
  const nisab2026 = getNisab2026();
  const cfg = year === 2026 && jurisdiction === 'ID' ? nisab2026.income : null;
  if (!cfg) return { status: 'RULE_SET_REQUIRED' as const, reason: 'No configured source-scoped income-zakat rule set for this year/jurisdiction.' };
  const amount = Number(income);
  const threshold = monthly ? cfg.nisabMonthlyIdr : cfg.nisabAnnualIdr;
  const due = amount >= threshold ? roundMoney(amount * cfg.rate) : 0;
  return { status: 'ASSESSED' as const, jurisdiction, year, zakatType: 'INCOME' as const, basisAmount: amount, nisab: threshold, rate: cfg.rate, due, currency: 'IDR' as const, sourceAuthority: nisab2026.authority, sourceReference: 'SK Ketua BAZNAS Nomor 15 Tahun 2026' };
}

export function calcGoldZakat({ grams = 0, goldValueIdrPerGram = 0, year = 2026, jurisdiction = 'ID', haul = false }: GoldZakatInput = {}) {
  if (jurisdiction !== 'ID' || year !== 2026) return { status: 'RULE_SET_REQUIRED' as const };
  const nisab2026 = getNisab2026();
  const amountGrams = Number(grams);
  const marketValue = amountGrams * Number(goldValueIdrPerGram);
  const eligible = amountGrams >= nisab2026.gold.nisabGrams && haul === true;
  return { status: 'ASSESSED' as const, jurisdiction, year, zakatType: 'GOLD' as const, grams: amountGrams, nisabGrams: nisab2026.gold.nisabGrams, haul, eligible, marketValueIdr: marketValue, rate: nisab2026.gold.rate, dueIdr: eligible ? roundMoney(marketValue * nisab2026.gold.rate) : 0, sourceAuthority: nisab2026.authority };
}

export function assessZakat(input: ZakatAssessmentInput = {}) {
  if (input.zakatType === 'INCOME') return calcIncomeZakat(input);
  if (input.zakatType === 'GOLD') return calcGoldZakat(input);
  const jurisdiction = input.jurisdiction ?? 'UNSPECIFIED';
  const configured = getRules().zakat?.[jurisdiction];
  return configured ? { status: 'RULE_SET_PRESENT' as const, jurisdiction, year: input.year, zakatType: input.zakatType, note: 'Implement asset-specific rule calculator with explicit authority.' } : { status: 'RULE_SET_REQUIRED' as const };
}
