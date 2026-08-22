type Loose = Record<string, any>;
import {createTypePack} from './type-pack.js';

export class DepartmentRegistry {
  declare typeRegistry: Loose;
  constructor(typeRegistry: Loose){
    if(!typeRegistry) throw new Error('DepartmentRegistry requires TypeRegistry');
    this.typeRegistry=typeRegistry;
  }
  define({departmentId,typeId,entityFamily='EVENT',defaults={},validate=()=>true,transform=(x: any)=>x,label=null,fields=[]}: Loose = {}): Loose {
    const pack=createTypePack({typeId,entityFamily,domain:departmentId,defaults,validate,transform});
    const enriched: Loose={...pack,departmentId};
    if(label) enriched.label=label;
    if(fields.length) enriched.fields=fields;
    this.typeRegistry.register(enriched);
    return enriched;
  }
  list(){return this.typeRegistry.list();}
}
