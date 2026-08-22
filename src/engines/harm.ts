// @ts-nocheck
export function harmProfile(amal){const f=amal.factors??{}; return {physical:Number(f.physicalImpact??0),financial:Number(f.financialImpact??0),social:Number(f.socialImpact??0),institutional:Number(f.systemicImpact??0),environmental:Number(f.environmentalImpact??0),reversible:f.reversible!==false};}
