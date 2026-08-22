export const states=['NORMAL_DUNYA','LATE_AGE','AKHIRZAMAN','COSMIC_TRANSITION','END_OF_DUNYA','BAATH','MAHSHAR'];
export function worldState(input='NORMAL_DUNYA'){if(!states.includes(input))throw new Error('Unknown world state');return {state:input,events:[],confidence:'CONFIGURED'};}
