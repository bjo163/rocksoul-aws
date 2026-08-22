export const INDONESIA_PROFILE={
  countryCode:'ID', name:'Indonesia', currency:'IDR', locale:'id-ID',
  jurisdiction:'IDN', masterDataModel:'ONE_DATA_INDONESIA',
  healthInteroperability:'SATUSEHAT_HL7_FHIR', publicServiceLanguage:'id'
};
export function indonesiaScope(){return {...INDONESIA_PROFILE,scope:'NATIONAL_ADAPTER'};}
