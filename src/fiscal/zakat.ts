// @ts-nocheck
import { runtimeDataset } from '../persistence/runtime-data.js';
const getRules = () => runtimeDataset('data/fiscal/rules.json') as any;
const getNisab2026 = () => runtimeDataset('data/fiscal/nisab-2026-id.json') as any;

function roundMoney(n) { return Math.round(n * 100) / 100; }

export function calcIncomeZakat({income, year=2026, jurisdiction='ID', monthly=false}={}) {
  const nisab2026 = getNisab2026();
  const cfg = year === 2026 && jurisdiction === 'ID' ? nisab2026.income : null;
  if (!cfg) return { status:'RULE_SET_REQUIRED', reason:'No configured source-scoped income-zakat rule set for this year/jurisdiction.' };
  const threshold = monthly ? cfg.nisabMonthlyIdr : cfg.nisabAnnualIdr;
  const rate = cfg.rate;
  const due = income >= threshold ? roundMoney(income * rate) : 0;
  return {status:'ASSESSED', jurisdiction, year, zakatType:'INCOME', basisAmount:income, nisab:threshold, rate, due, currency:'IDR', sourceAuthority:nisab2026.authority, sourceReference:'SK Ketua BAZNAS Nomor 15 Tahun 2026'};
}

export function calcGoldZakat({grams, goldValueIdrPerGram, year=2026, jurisdiction='ID', haul=false}={}) {
  if (jurisdiction !== 'ID' || year !== 2026) return { status:'RULE_SET_REQUIRED' };
  const nisab2026 = getNisab2026();
  const marketValue = Number(grams || 0) * Number(goldValueIdrPerGram || 0);
  const eligible = Number(grams || 0) >= nisab2026.gold.nisabGrams && haul === true;
  return {status:'ASSESSED', jurisdiction, year, zakatType:'GOLD', grams, nisabGrams:nisab2026.gold.nisabGrams, haul, eligible, marketValueIdr:marketValue, rate:nisab2026.gold.rate, dueIdr:eligible ? roundMoney(marketValue * nisab2026.gold.rate) : 0, sourceAuthority:nisab2026.authority};
}

export function assessZakat(input={}) {
  if (input.zakatType === 'INCOME') return calcIncomeZakat(input);
  if (input.zakatType === 'GOLD') return calcGoldZakat(input);
  const configured = getRules().zakat?.[input.jurisdiction];
  return configured ? {status:'RULE_SET_PRESENT', jurisdiction:input.jurisdiction, year:input.year, zakatType:input.zakatType, note:'Implement asset-specific rule calculator with explicit authority.'} : {status:'RULE_SET_REQUIRED'};
}
