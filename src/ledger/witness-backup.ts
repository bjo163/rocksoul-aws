import { createHash, randomUUID } from 'node:crypto';
import { copyFile, mkdir, readFile, readdir, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { WitnessDag } from './witness-dag.js';

export interface WitnessBackupManifest {
  version: 1;
  backupId: string;
  witnessId: string;
  createdAt: string;
  qdagRoot: string | null;
  nodeCount: number;
  files: Array<{ name: string; sha256: string; bytes: number }>;
  passwordIncluded: false;
  note: string;
}

function digest(data: Buffer | string): string { return createHash('sha256').update(data).digest('hex'); }

async function atomicWrite(filePath: string, data: string | Buffer, mode = 0o600): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true, mode: 0o700 });
  const tmp = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(tmp, data, { mode });
  await rename(tmp, filePath);
}

export class WitnessBackupManager {
  constructor(private readonly options: { dataDir: string; dag: WitnessDag; witnessId: string }) {}

  get backupRoot(): string { return path.join(this.options.dataDir, 'witness-backups'); }

  async create(createdAt = new Date().toISOString()): Promise<{ directory: string; manifest: WitnessBackupManifest }> {
    const backupId = `WBK_${createdAt.replace(/[:.]/g, '-')}_${randomUUID().slice(0, 8)}`;
    const directory = path.join(this.backupRoot, backupId);
    await mkdir(directory, { recursive: true, mode: 0o700 });

    const sourceDir = path.join(this.options.dataDir, 'witness');
    const files: WitnessBackupManifest['files'] = [];
    for (const name of ['keystore.json.enc', 'checkpoints.json', 'qdag.json']) {
      const source = path.join(sourceDir, name);
      try {
        const data = await readFile(source);
        await atomicWrite(path.join(directory, name), data);
        files.push({ name, sha256: digest(data), bytes: data.byteLength });
      } catch (error: any) {
        if (error?.code !== 'ENOENT') throw error;
      }
    }

    const snapshotData = Buffer.from(JSON.stringify(this.options.dag.snapshot(), null, 2));
    await atomicWrite(path.join(directory, 'qdag-snapshot.json'), snapshotData);
    files.push({ name: 'qdag-snapshot.json', sha256: digest(snapshotData), bytes: snapshotData.byteLength });

    const verification = this.options.dag.verify();
    if (!verification.valid) throw new Error(`WITNESS_BACKUP_DAG_INVALID:${verification.reason ?? 'UNKNOWN'}`);
    const manifest: WitnessBackupManifest = {
      version: 1,
      backupId,
      witnessId: this.options.witnessId,
      createdAt,
      qdagRoot: verification.root,
      nodeCount: verification.nodes,
      files,
      passwordIncluded: false,
      note: 'WITNESS_KEY_PASSWORD and development .local-master-secret are intentionally excluded; protect them separately.',
    };
    await atomicWrite(path.join(directory, 'manifest.json'), JSON.stringify(manifest, null, 2));
    return { directory, manifest };
  }

  async verify(directory: string): Promise<{ valid: boolean; manifest: WitnessBackupManifest; failures: string[] }> {
    const manifest = JSON.parse(await readFile(path.join(directory, 'manifest.json'), 'utf8')) as WitnessBackupManifest;
    if (manifest?.version !== 1 || !Array.isArray(manifest.files)) throw new Error('WITNESS_BACKUP_MANIFEST_UNSUPPORTED');
    const failures: string[] = [];
    for (const entry of manifest.files) {
      try {
        const data = await readFile(path.join(directory, entry.name));
        if (data.byteLength !== entry.bytes) failures.push(`${entry.name}:SIZE_MISMATCH`);
        if (digest(data) !== entry.sha256) failures.push(`${entry.name}:HASH_MISMATCH`);
      } catch { failures.push(`${entry.name}:MISSING`); }
    }
    try {
      const snapshot=JSON.parse(await readFile(path.join(directory,'qdag-snapshot.json'),'utf8'));
      const rebuilt=WitnessDag.fromSnapshot({version:1,nodes:snapshot.nodes ?? []});
      const verification=rebuilt.verify();
      if(!verification.valid) failures.push(`qdag-snapshot.json:DAG_${verification.reason ?? 'INVALID'}`);
      if(rebuilt.root() !== manifest.qdagRoot) failures.push('qdag-snapshot.json:ROOT_MISMATCH');
      if(rebuilt.list().length !== manifest.nodeCount) failures.push('qdag-snapshot.json:NODE_COUNT_MISMATCH');
    } catch { failures.push('qdag-snapshot.json:SNAPSHOT_INVALID'); }
    return { valid: failures.length === 0, manifest, failures };
  }

  async list(): Promise<Array<{ directory: string; manifest: WitnessBackupManifest }>> {
    try {
      const entries = await readdir(this.backupRoot, { withFileTypes: true });
      const results: Array<{ directory: string; manifest: WitnessBackupManifest }> = [];
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const directory = path.join(this.backupRoot, entry.name);
        try { results.push({ directory, manifest: JSON.parse(await readFile(path.join(directory, 'manifest.json'), 'utf8')) }); } catch {}
      }
      return results.sort((a, b) => b.manifest.createdAt.localeCompare(a.manifest.createdAt));
    } catch (error: any) { if (error?.code === 'ENOENT') return []; throw error; }
  }

  /** Restore local witness files. Caller must restart/reopen runtime afterwards. */
  async restore(directory: string): Promise<WitnessBackupManifest> {
    const checked = await this.verify(directory);
    if (!checked.valid) throw new Error(`WITNESS_BACKUP_INVALID:${checked.failures.join(',')}`);
    const targetDir = path.join(this.options.dataDir, 'witness');
    await mkdir(targetDir, { recursive: true, mode: 0o700 });
    for (const name of ['keystore.json.enc', 'checkpoints.json']) {
      if (!checked.manifest.files.some((x) => x.name === name)) continue;
      await copyFile(path.join(directory, name), path.join(targetDir, name));
    }
    const snapshot=JSON.parse(await readFile(path.join(directory,'qdag-snapshot.json'),'utf8'));
    const qdagFile={version:1,nodes:snapshot.nodes ?? [],savedAt:new Date().toISOString(),root:checked.manifest.qdagRoot};
    await atomicWrite(path.join(targetDir,'qdag.json'),JSON.stringify(qdagFile,null,2));
    return checked.manifest;
  }
}
