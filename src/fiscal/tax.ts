// @ts-nocheck
import { runtimeDataset } from '../persistence/runtime-data.js';
const getRules = () => runtimeDataset('data/fiscal/rules.json') as any;

export function assessTax(input={}) {
  const {jurisdiction='UNSPECIFIED', taxYear, taxType, grossAmount=0, deductions=0, zakatPaid=0} = input;
  const cfg = getRules().tax?.[jurisdiction];
  if (!cfg) return {status:'JURISDICTION_REQUIRED', jurisdiction, taxYear, taxType, taxableBase:null};
  const base = Math.max(0, Number(grossAmount) - Number(deductions));
  return {
    status:'RULE_SET_REQUIRED_FOR_RATE',
    jurisdiction, taxYear, taxType,
    grossAmount:Number(grossAmount), deductions:Number(deductions), zakatPaid:Number(zakatPaid), taxableBase:base,
    sourceAuthority:cfg.authority,
    note:'No rate is inferred. Supply a current official tax-year rule set before calculating liability.'
  };
}
