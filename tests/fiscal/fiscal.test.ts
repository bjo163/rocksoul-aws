// @ts-nocheck
import assert from 'node:assert/strict';
import { calcIncomeZakat, calcGoldZakat } from '../../src/fiscal/zakat.js';
import { assessTax } from '../../src/fiscal/tax.js';
import { assessJizyah } from '../../src/fiscal/jizyah.js';
import { assessFiscalEvent } from '../../src/fiscal/fiscal-analyzer.js';
const z=calcIncomeZakat({income:10000000,year:2026,jurisdiction:'ID',monthly:true});
assert.equal(z.due,250000); assert.equal(z.nisab,7640144);
const g=calcGoldZakat({grams:100,goldValueIdrPerGram:1000000,year:2026,jurisdiction:'ID',haul:true});
assert.equal(g.dueIdr,2500000);
const tx=assessTax({jurisdiction:'ID',taxYear:2026,taxType:'UNSPECIFIED',grossAmount:100000000});
assert.equal(tx.status,'RULE_SET_REQUIRED_FOR_RATE');
const j=assessJizyah({}); assert.equal(j.modernApplicability,'NOT_AUTOMATIC');
const n=assessFiscalEvent({text:'zakat penghasilan bulanan 10000000',jurisdiction:'ID',year:2026}); assert.equal(n.result.due,250000);
console.log('PASS: fiscal tests');
