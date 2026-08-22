// @ts-nocheck
export function explainLegalResult(result){
  return {
    query:result.query,
    jurisdiction:result.jurisdiction,
    classification:result.action,
    legalStatus:result.legal?.status,
    religiousAuthority:result.legal?.religious?.sourceAuthority ?? null,
    civilRule:result.legal?.civil?.note ?? null,
    semanticPrimary:result.semantic?.asma?.primary?.name ?? null,
    note:'This is a decision-support explanation, not legal advice or a judicial verdict.'
  };
}
