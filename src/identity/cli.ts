import { RidEngine } from './rid-engine.js';
const action=process.argv[2]||'help'; const engine=new RidEngine({storePath:'./data/runtime/rid-registry.json'});
if(action==='create'){const r=engine.create({displayName:process.argv[3]||null,countryCode:process.argv[4]||null});console.log(JSON.stringify(r,null,2));}
else if(action==='get'){console.log(JSON.stringify(engine.get(process.argv[3]),null,2));}
else {console.log('RID CLI: node src/identity/cli.ts create "Name" ID | get RID');}
