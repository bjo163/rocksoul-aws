// @ts-nocheck
import fs from 'node:fs';
export class RuleCatalog {
  constructor(files=[]){this.rules=[]; for(const f of files){ if(fs.existsSync(f)){const x=JSON.parse(fs.readFileSync(f,'utf8'));this.rules.push(...(Array.isArray(x)?x:(x.rules||[])));}}}
  add(rule){this.rules.push(rule);}
  find(predicate){return this.rules.filter(predicate);}
  all(){return [...this.rules];}
}
