// @ts-nocheck
import crypto from 'node:crypto';
export class Ledger { constructor(){this.entries=[];} append(payload){const prev=this.entries.at(-1)?.hash??''; const rec={id:`LEDGER_${crypto.randomUUID()}`,at:new Date().toISOString(),prev,payload}; rec.hash=crypto.createHash('sha256').update(prev+JSON.stringify(rec)).digest('hex'); this.entries.push(rec); return rec;} verify(){let prev='';for(const e of this.entries){const {hash,...rest}=e;const exp=crypto.createHash('sha256').update(prev+JSON.stringify(rest)).digest('hex');if(exp!==hash)return false;prev=hash;}return true;}}
