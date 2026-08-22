// @ts-nocheck
export function witnessProfile({amal,evidence=[]}){return {amalId:amal.amalId,sources:evidence.length,types:['RECORDING_ABSTRACTION','SYSTEM_EVIDENCE','WITNESS_ABSTRACTION'],confidence:evidence.length?0.8:0.2};}
