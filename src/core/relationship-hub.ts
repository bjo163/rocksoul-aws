// @ts-nocheck
import {RidEngine} from '../identity/rid-engine.js';
import {AssetLedger} from '../wealth/asset-ledger.js';
import {wealthProfile} from '../wealth/wealth-engine.js';
import {validateCaseIdentity} from '../identity/relation-integrity.js';

export class RelationshipHub {
  constructor({ridEngine=new RidEngine(),assetLedger=new AssetLedger()}={}){this.ridEngine=ridEngine;this.assetLedger=assetLedger;}
  profile(rid){
    const identity=this.ridEngine.get(rid); if(!identity) throw new Error('Unknown RID');
    const assets=this.assetLedger.byRid(rid);
    return {rid,identity,assets,wealth:wealthProfile({assets}),integrity:validateCaseIdentity({rid,personId:identity.personId,ruhId:identity.ruhId,assetRid:assets[0]?.rid??rid})};
  }
}
