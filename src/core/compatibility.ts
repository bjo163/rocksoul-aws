// @ts-nocheck
/** Legacy domains remain available. This bridge lets them register as type packs in the universal kernel. */
export function registerLegacyTypePack(runtime,{typeId,entityFamily,handler,source='legacy'}={}){
  return runtime.typeRegistry.register({typeId,entityFamily,handlerName:handler?.name??null,source,adapter:'LEGACY_BRIDGE',version:1});
}
