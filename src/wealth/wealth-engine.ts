// @ts-nocheck
export function liabilitiesTotal(liabilities=[]){return liabilities.reduce((s,x)=>s+(Number(x.amount)||0),0)}
export function netWealth({assets=[],liabilities=[]}={}){
  const totalAssets=assets.reduce((s,x)=>s+(Number(x.value)||0),0); const totalLiabilities=liabilitiesTotal(liabilities); return {totalAssets,totalLiabilities,netWorth:totalAssets-totalLiabilities};
}
export function wealthProfile({assets=[],liabilities=[],income=0,publicObligations=0,religiousObligations=0}={}){
  const n=netWealth({assets,liabilities}); return {...n,income:Number(income)||0,publicObligations:Number(publicObligations)||0,religiousObligations:Number(religiousObligations)||0};
}
