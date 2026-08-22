// @ts-nocheck
export function economyProfile({employment=[],businesses=[],transactions=[]}={}){return{employment,businesses,transactionCount:transactions.length,grossTransactionVolume:transactions.reduce((s,t)=>s+(+t.amount||0),0)}}
