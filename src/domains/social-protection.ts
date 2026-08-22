// @ts-nocheck
export function socialProtectionProfile({households=[],programs=[]}={}){return{households,programs,vulnerableHouseholds:households.filter(x=>x.vulnerable===true).length,coverageRate:households.length?programs.length/households.length:0}}
