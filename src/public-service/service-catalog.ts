export const SERVICES = [
  'IDENTITY','CIVIL_REGISTRATION','HEALTH','EDUCATION','SOCIAL_WELFARE','TAX','ZAKAT','BUSINESS','PROPERTY','JUSTICE','DISASTER','PROJECTS','PUBLIC_COMPLAINTS'
];
export function serviceCatalogue(){ return SERVICES.map((id,i)=>({id,code:`IDN.SVC.${String(i+1).padStart(3,'0')}`})); }
