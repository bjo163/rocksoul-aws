import { assessZakat } from './zakat.js';
import { assessTax } from './tax.js';
import { assessJizyah } from './jizyah.js';

export function assessFiscalEvent({text='', jurisdiction='ID', year=2026}={}) {
  const t = String(text).toLowerCase();
  if (t.includes('zakat') || t.includes('zakat penghasilan')) {
    const incomeMatch = t.match(/(?:penghasilan|gaji|income)[^0-9]*([0-9][0-9.,]*)/);
    const income = incomeMatch ? Number(incomeMatch[1].replace(/\./g,'').replace(',','.')) : null;
    const monthly = t.includes('bulanan') || t.includes('per bulan') || t.includes('setiap bulan');
    return {intent:'ZAKAT', query:text, result: income != null ? assessZakat({zakatType:'INCOME',income,monthly,year,jurisdiction}) : {status:'INPUT_REQUIRED',fields:['income','zakatType','period']}};
  }
  if (t.includes('jizyah')) return {intent:'JIZYAH', query:text, result:assessJizyah({jurisdiction})};
  if (t.includes('pajak') || t.includes('tax')) return {intent:'TAX', query:text, result:assessTax({jurisdiction,taxYear:year,taxType:'UNSPECIFIED',grossAmount:0})};
  return {intent:'UNKNOWN', query:text, result:{status:'UNRECOGNIZED'}};
}
