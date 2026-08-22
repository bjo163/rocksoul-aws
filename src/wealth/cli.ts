// @ts-nocheck
import { RidEngine } from '../identity/rid-engine.js';
import { AssetLedger } from './asset-ledger.js';
import { wealthProfile } from './wealth-engine.js';
const rid=process.argv[2]; const type=process.argv[3]; const value=Number(process.argv[4]||0); const name=process.argv[5]||type;
if(!rid||!type){console.log('Usage: node src/wealth/cli.ts RID GOLD 100000000 "Gold"');process.exit(1)}
const ids=new RidEngine({storePath:'./data/runtime/rid-registry.json'}); if(!ids.get(rid)){console.error('Unknown RID');process.exit(1)}
const ledger=new AssetLedger(); ledger.addAsset({rid,type,name,value,currency:'IDR'}); console.log(JSON.stringify(wealthProfile({assets:ledger.byRid(rid)}),null,2));
