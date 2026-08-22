// @ts-nocheck
const TYPES=new Set(["SALAH","DUHA","ZAKAT","SAWM","HAJJ","DUA","DHIKR","CHARITY","TAWBAH"]);
export function worshipProfile(amal={}) { const action=String(amal.action??"").toUpperCase(); return {isWorship:TYPES.has(action), type:TYPES.has(action)?action:null}; }
