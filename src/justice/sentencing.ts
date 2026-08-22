export function sentencingProfile({severity='UNRESOLVED',harm=0,responsibility=0,mitigation=0,aggravation=0,restitution=0}={}){
  return {severity,harm,responsibility,mitigation,aggravation,restitution,mode:'LAW_AND_JURISDICTION_DEPENDENT',possibleRemedies:['RESTITUTION','FINE','PROBATION','COMMUNITY_SERVICE','IMPRISONMENT','OTHER_LAWFUL_REMEDY']};
}
