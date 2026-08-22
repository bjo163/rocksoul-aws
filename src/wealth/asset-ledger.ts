// @ts-nocheck
import crypto from 'node:crypto';
export const ASSET_TYPES=['CASH','BANK','GOLD','SILVER','STOCK','BUSINESS','PROPERTY','INVENTORY','CRYPTO','VEHICLE','RECEIVABLE','INTELLECTUAL_PROPERTY','OTHER'];
export class AssetLedger {
  constructor(){this.assets=new Map();this.events=[];}
  addAsset({rid,assetId=`ASSET_${crypto.randomUUID()}`,type,name,quantity=null,unit=null,value=0,currency='IDR',ownership='SOLE',status='ACTIVE',source=null}: {rid?: string; assetId?: string; type?: string; name?: string; quantity?: number | null; unit?: string | null; value?: number; currency?: string; ownership?: string; status?: string; source?: string | null} = {}){
    if(!rid || !type) throw new Error('asset requires rid and type');
    const asset={assetId,rid,type,name,quantity,unit,value:Number(value)||0,currency,ownership,status,source,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
    this.assets.set(assetId,asset); this.events.push({eventId:`ASSET_EVT_${crypto.randomUUID()}`,assetId,rid,type:'CREATE',deltaValue:asset.value,at:new Date().toISOString()}); return asset;
  }
  updateValue(assetId,value,reason='REVALUATION'){const a=this.assets.get(assetId);if(!a)throw new Error('Unknown asset');const old=a.value;a.value=Number(value)||0;a.updatedAt=new Date().toISOString();this.events.push({eventId:`ASSET_EVT_${crypto.randomUUID()}`,assetId,rid:a.rid,type:reason,deltaValue:a.value-old,at:new Date().toISOString()});return a;}
  byRid(rid){return [...this.assets.values()].filter(a=>a.rid===rid);}
  wealthSummary(rid){const assets=this.byRid(rid);const totalByCurrency={};for(const a of assets)totalByCurrency[a.currency]=(totalByCurrency[a.currency]||0)+a.value;return {rid,assets,totalByCurrency};}
}
