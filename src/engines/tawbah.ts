// @ts-nocheck
export function tawbahProfile(amal){const f=amal.factors??{}; return {awareness:Boolean(f.awareness),regret:Boolean(f.regret),stopped:Boolean(f.stopped),returned:Boolean(f.returned),repaired:Boolean(f.repair),reconciled:Boolean(f.reconciliation),state:f.repair?'RESOLVED':f.regret?'REPENTANCE_DECLARED':'OPEN'};}
