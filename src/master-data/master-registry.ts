// @ts-nocheck
import fs from 'node:fs';
import path from 'node:path';
export class MasterRegistry {
  constructor(file) { this.file=file; fs.mkdirSync(path.dirname(file),{recursive:true}); this.data=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):{}; }
  upsert(type, id, record) { this.data[type]??={}; this.data[type][id]=record; this.flush(); return record; }
  get(type,id){ return this.data[type]?.[id]||null; }
  list(type){ return Object.entries(this.data[type]||{}).map(([id,record])=>({id,...record})); }
  flush(){ fs.writeFileSync(this.file,JSON.stringify(this.data,null,2)); }
}
