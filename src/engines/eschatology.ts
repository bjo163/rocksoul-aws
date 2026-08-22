// @ts-nocheck
const allowed = { DUNYA: 'DYING', DYING: 'DECEASED', DECEASED: 'BARZAKH', BARZAKH: 'RESURRECTION', RESURRECTION: 'MAHSHAR', MAHSHAR: 'HISAB', HISAB: 'MIZAN', MIZAN: 'FINAL_STATE' };
export function transition(person, next) { if (allowed[person.state] !== next)
    throw new Error(`Invalid transition ${person.state} -> ${next}`); return { ...person, state: next, alive: next === 'DUNYA' || next === 'DYING' }; }
export function destinationModel({ state } = {}) { if (state !== 'FINAL_STATE')
    return 'NOT_DETERMINABLE'; return 'MODEL_ONLY_FINAL_STATE'; }
//# sourceMappingURL=eschatology.js.map