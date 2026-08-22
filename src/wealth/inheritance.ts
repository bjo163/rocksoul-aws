// @ts-nocheck
export function createEstate({rid,assets=[],liabilities=[],will=null,status='OPEN'}={}){return {estateId:`ESTATE_${rid}`,rid,assets,liabilities,will,status,createdAt:new Date().toISOString()};}
export function distributableEstate({assets=[],liabilities=[]}){const a=assets.reduce((s,x)=>s+(Number(x.value)||0),0);const l=liabilities.reduce((s,x)=>s+(Number(x.amount)||0),0);return Math.max(0,a-l);}
