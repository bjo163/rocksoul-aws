import assert from 'node:assert/strict';
import fs from 'node:fs';
import { RidEngine } from '../../src/identity/rid-engine.js';
import { AssetLedger } from '../../src/wealth/asset-ledger.js';
import { RelationshipHub } from '../../src/core/relationship-hub.js';
import { analyzeText } from '../../src/ai/analyzer.js';

const store='./data/runtime/test-rid-registry.json';
try { fs.rmSync(store,{force:true}); } catch {}
const ids=new RidEngine({storePath:store});
const person=ids.create({displayName:'Integration Test',countryCode:'ID'});
const assets=new AssetLedger(); assets.addAsset({rid:person.rid,type:'GOLD',name:'Gold',value:100000000});
const hub=new RelationshipHub({ridEngine:ids,assetLedger:assets});
const profile=hub.profile(person.rid);
assert.equal(profile.integrity.valid,true);
assert.equal(profile.wealth.totalAssets,100000000);
const result=analyzeText('merokok saat puasa di tempat umum',{rid:person.rid, semanticObservation:{
  action:'SEMANTIC_ACTION', mode:'DEVIATION', confidence:0.82,
  intention:{label:'HEALTH_RISK',confidence:0.8,rgbl:{R:-0.2,G:-0.1,B:0.3,L:-0.3},chain:[]},
  actionGateVector:Array(9).fill(0.2), impactVector:Array(13).fill(0.4),
  domainVector:{HEALTH:0.82}, timeFactor:{timestamp:new Date().toISOString(),sequence:1},
  causality:{causal_strength:0.5,confidence:0.8}, evidence:[{type:'DOMAIN',reference:'HEALTH'}], caseId:'CASE-PROD',
}});
assert.equal(result.mizan?.actionGateVector.length,9);
assert.equal(result.mizan?.impactVector.length,13);
assert.equal(result.lifecycle?.final?.state,'FINAL_STATE');
fs.rmSync(store,{force:true});
console.log('PASS: production integration (RID + wealth + semantic analyzer + lifecycle)');
