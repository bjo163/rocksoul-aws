// @ts-nocheck
import {createPerson,createAmal,evaluateAmal,createWorldRecord} from './engine.js';
import {createKhilafahModel} from './engines/khilafah.js';
import {createScenario} from './engines/prophetic.js';
import {Ledger} from './engines/ledger.js';
const person=createPerson({alive:true});
const world=createWorldRecord({state:'AKHIRZAMAN',countryId:'ID',spaceRegion:'EARTH',eraId:'CURRENT'});
const amal=createAmal({person,sourceId:'S03',gatewayId:'G06',processId:'P03',action: process.env.MW_ACTION ?? 'UNKNOWN',intention: process.env.MW_INTENTION ?? 'UNKNOWN',countryId:'ID',spaceRegion:'EARTH',factors:{base:10,responsibility:.8,impact:.9,repetition:.4,systemicity:.7}});
const result=evaluateAmal(amal,{semantic:{R:-.5,G:-.7,B:-1,L:-.4}});
const ledger=new Ledger(); ledger.append({type:'AMAL',ruhId:person.ruhId,amalId:amal.amalId}); ledger.append({type:'MIZAN_MODEL',score:result.mizan.score});
console.log(JSON.stringify({person,world,result,khilafah:createKhilafahModel(),propheticScenario:createScenario({prophetId:'ISA',worldState:'AKHIRZAMAN'}),ledger:{valid:ledger.verify(),entries:ledger.entries.length}},null,2));
