type Loose = Record<string, any>;
import fs from 'node:fs';
import path from 'node:path';

export class TypeRegistry {
  declare storePath: string | null; declare types: Map<string, Loose>;
  constructor({storePath = null}: Loose = {}) {
    this.storePath = storePath;
    this.types = new Map();
    if (storePath && fs.existsSync(storePath)) {
      const raw: Loose = JSON.parse(fs.readFileSync(storePath, 'utf8'));
      for (const t of raw.types ?? []) this.register(t);
    }
  }
  register(type: Loose): Loose {
    if (!type?.typeId || !type?.entityFamily) throw new Error('typeId and entityFamily are required');
    const stored: Loose = {...type};
    this.types.set(type.typeId, stored);
    this.#persist();
    return stored;
  }
  get(typeId: string): Loose | null { return this.types.get(typeId) ?? null; }
  list(): Loose[] { return [...this.types.values()].sort((a,b) => a.typeId.localeCompare(b.typeId)); }
  #persist() {
    if (!this.storePath) return;
    fs.mkdirSync(path.dirname(this.storePath), {recursive:true});
    fs.writeFileSync(this.storePath, JSON.stringify({types:this.list()}, null, 2));
  }
}
