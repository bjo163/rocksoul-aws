import { assessFiscalEvent } from './fiscal-analyzer.js';
const text = process.argv.slice(2).join(' ') || 'zakat penghasilan 10000000';
console.log(JSON.stringify(assessFiscalEvent({text,jurisdiction:process.env.MW_JURISDICTION || 'ID',year:Number(process.env.MW_TAX_YEAR || 2026)}),null,2));
