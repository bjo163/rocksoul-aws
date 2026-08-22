export function clinicalSafetyGate({advice=false, evidenceLevel='UNKNOWN'}={}) {
  if (!advice) return {status:'NON_CLINICAL', disclaimer:'No clinical decision is being made.'};
  return {status:evidenceLevel==='HIGH'?'ADVISORY_REVIEW':'REQUIRES_CLINICIAN_REVIEW', disclaimer:'Decision support only; not a diagnosis or prescription.'};
}
