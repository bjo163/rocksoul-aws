// @ts-nocheck
export function responsibilityProfile(amal={}) {
  const f=amal.factors??{};
  const knowledge=Number(f.knowledge??0), capacity=Number(f.capacity??0), choice=Number(f.choice??0);
  const coercion=Number(f.coercion??0), opportunity=Number(f.opportunity??0);
  const raw=(knowledge+capacity+choice+opportunity)/4 - coercion*0.8;
  return {score:Math.max(0,Math.min(1,raw)), drivers:{knowledge,capacity,choice,coercion,opportunity}, qadrBoundary:"DIVINE_ONLY"};
}
