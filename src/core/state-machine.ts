// @ts-nocheck
const transitions = {
  CREATION:['DUNYA','DECEASED'], DUNYA:['DYING','DECEASED'], DYING:['DECEASED'], DECEASED:['BARZAKH'], BARZAKH:['RESURRECTION'], RESURRECTION:['MAHSHAR'], MAHSHAR:['HISAB'], HISAB:['MIZAN'], MIZAN:['FINAL_STATE'], FINAL_STATE:['FINAL_STATE']
};
export function transition(person, next) {
  const allowed = transitions[person.state] ?? [];
  if (!allowed.includes(next) && person.state !== next) throw new Error(`Invalid state transition: ${person.state} -> ${next}`);
  return {...person, state: next, alive: ['CREATION','DUNYA','DYING'].includes(next)};
}
export const stateGraph = () => structuredClone(transitions);
