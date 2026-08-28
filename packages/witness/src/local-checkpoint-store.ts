import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { SignedCheckpoint } from './distributed-witness.js';

export class LocalCheckpointStore {
  #items: SignedCheckpoint[] = [];
  private constructor(readonly filePath: string) {}
  static async open(filePath: string): Promise<LocalCheckpointStore> {
    const store = new LocalCheckpointStore(filePath);
    try { const parsed=JSON.parse(await readFile(filePath,'utf8')); store.#items=Array.isArray(parsed?.checkpoints)?parsed.checkpoints:[]; }
    catch (error: unknown) { if((error as { code?: string })?.code!=='ENOENT') throw error; }
    return store;
  }
  list(): SignedCheckpoint[] { return structuredClone(this.#items).sort((a,b)=>b.checkpoint.createdAt.localeCompare(a.checkpoint.createdAt)); }
  latest(): SignedCheckpoint | null { return this.list()[0] ?? null; }
  async put(item: SignedCheckpoint): Promise<void> {
    const key=`${item.checkpoint.checkpointId}:${item.witnessId}`;
    const index=this.#items.findIndex(x=>`${x.checkpoint.checkpointId}:${x.witnessId}`===key);
    if(index>=0) this.#items[index]=structuredClone(item); else this.#items.push(structuredClone(item));
    await mkdir(path.dirname(this.filePath),{recursive:true,mode:0o700}); const tmp=`${this.filePath}.${process.pid}.tmp`;
    await writeFile(tmp,JSON.stringify({version:1,checkpoints:this.#items},null,2),{mode:0o600}); await rename(tmp,this.filePath);
  }
}
