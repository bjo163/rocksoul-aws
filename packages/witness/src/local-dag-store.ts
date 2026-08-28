import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { WitnessDag, type DagNode } from './witness-dag.js';

export interface LocalDagFile { version: 1; nodes: DagNode[]; savedAt: string; root: string | null }

export class LocalWitnessDagStore {
  private constructor(readonly filePath: string) {}

  static async open(filePath: string): Promise<LocalWitnessDagStore> {
    return new LocalWitnessDagStore(filePath);
  }

  async hydrate(target: WitnessDag): Promise<{ loaded: number; root: string | null }> {
    try {
      const raw = JSON.parse(await readFile(this.filePath, 'utf8')) as LocalDagFile;
      if (raw?.version !== 1 || !Array.isArray(raw.nodes)) throw new Error('LOCAL_QDAG_FORMAT_UNSUPPORTED');
      const rebuilt = WitnessDag.fromSnapshot({ version: 1, nodes: raw.nodes });
      const verification = rebuilt.verify();
      if (!verification.valid) throw new Error(`LOCAL_QDAG_INVALID:${verification.reason ?? 'UNKNOWN'}`);
      for (const node of rebuilt.list()) target.import(node);
      return { loaded: rebuilt.list().length, root: rebuilt.root() };
    } catch (error: unknown) {
      if ((error as { code?: string })?.code === 'ENOENT') return { loaded: 0, root: null };
      throw error;
    }
  }

  async save(dag: WitnessDag): Promise<void> {
    const verification = dag.verify();
    if (!verification.valid) throw new Error(`LOCAL_QDAG_REFUSE_INVALID:${verification.reason ?? 'UNKNOWN'}`);
    const payload: LocalDagFile = { version: 1, nodes: dag.list(), savedAt: new Date().toISOString(), root: dag.root() };
    await mkdir(path.dirname(this.filePath), { recursive: true, mode: 0o700 });
    const tmp = `${this.filePath}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(tmp, JSON.stringify(payload, null, 2), { mode: 0o600 });
    await rename(tmp, this.filePath);
  }
}
