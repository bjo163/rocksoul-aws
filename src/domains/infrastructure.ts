// @ts-nocheck
export function infrastructureProfile({assets=[],projects=[]}={}){return{assets,projects,totalAssets:assets.length,totalProjects:projects.length,maintenanceRequired:assets.filter(x=>x.maintenanceDue===true).length}}
