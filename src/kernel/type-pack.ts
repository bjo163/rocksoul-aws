type Loose = Record<string, any>;
export function createTypePack({typeId,entityFamily,domain,defaults={},validate=()=>true,transform=(x: any)=>x}: Loose): Loose {
  if(!typeId||!entityFamily) throw new Error('typeId and entityFamily required');
  return {typeId,entityFamily,domain,defaults,validate,transform,createdAt:new Date().toISOString()};
}
export function applyTypePack(pack: Loose,input: Loose = {}): Loose {
  const normalized={...pack.defaults,...input,typeId:pack.typeId};
  if(!pack.validate(normalized)) throw new Error(`Validation failed for ${pack.typeId}`);
  return pack.transform(normalized);
}
