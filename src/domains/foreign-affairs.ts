// @ts-nocheck
export function foreignAffairsProfile({treaties=[],missions=[],tradeAgreements=[]}={}){return{treaties,missions,tradeAgreements,activeTreaties:treaties.filter(x=>x.status==='ACTIVE').length}}
