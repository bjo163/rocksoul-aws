// @ts-nocheck
export const LIFE_STATES = ['DUNYA','DYING','DECEASED','BARZAKH','RESURRECTION','MAHSHAR','HISAB','MIZAN','FINAL_STATE'];
export function transitionLifeState(current,next){
  const allowed={DUNYA:['DYING'],DYING:['DECEASED'],DECEASED:['BARZAKH'],BARZAKH:['RESURRECTION'],RESURRECTION:['MAHSHAR'],MAHSHAR:['HISAB'],HISAB:['MIZAN'],MIZAN:['FINAL_STATE'],FINAL_STATE:[]};
  if(!allowed[current]?.includes(next)) throw new Error(`Invalid life transition: ${current} -> ${next}`);
  return next;
}
export function createLifeEvent({rid,state,eventType,source=null,details={}}){
  return {rid,state,eventType,source,details,recordedAt:new Date().toISOString()};
}
