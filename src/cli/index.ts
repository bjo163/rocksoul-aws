import fs from 'node:fs'; import {evaluate} from '../core/divine-order-engine.js';
const f=process.argv[2]; const input=f?JSON.parse(fs.readFileSync(f,'utf8')):{amalInput:{action: process.env.MW_ACTION ?? 'UNKNOWN',intention: process.env.MW_INTENTION ?? 'UNKNOWN',context:{lawless:true,exceptionIds:['EXCEPTION_01'],genesis:{sourceId:'S01',gatewayId:'G01',processId:'P01'}},factors:{base:10,responsibility:.8,impact:.9,exposure:.7,duration:.8,repetition:.5,systemicity:.9}}};
console.log(JSON.stringify(evaluate(input),null,2));
