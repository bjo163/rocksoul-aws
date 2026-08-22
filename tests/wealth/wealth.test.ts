// @ts-nocheck
import assert from 'node:assert/strict';
import { AssetLedger } from '../../src/wealth/asset-ledger.js';
import { wealthProfile } from '../../src/wealth/wealth-engine.js';
const l=new AssetLedger(); l.addAsset({rid:'RID-1',type:'GOLD',name:'Gold',value:100000000,currency:'IDR'}); l.addAsset({rid:'RID-1',type:'BANK',name:'Cash',value:50000000,currency:'IDR'});
const p=wealthProfile({assets:l.byRid('RID-1'),liabilities:[{amount:10000000}]}); assert.equal(p.totalAssets,150000000); assert.equal(p.netWorth,140000000); console.log('PASS wealth tests');
