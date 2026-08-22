// @ts-nocheck
export function createShuraSession({sessionId, proposer, agenda, participants=[]}) {
  return {
    sessionId,
    proposer,
    agenda,
    participants,
    evidence: [],
    opinions: [],
    dissent: [],
    recommendation: null,
    status: 'OPEN'
  };
}

export function addOpinion(session, opinion) {
  return { ...session, opinions: [...session.opinions, opinion] };
}

export function closeShura(session, recommendation) {
  return { ...session, recommendation, status: 'CLOSED' };
}
