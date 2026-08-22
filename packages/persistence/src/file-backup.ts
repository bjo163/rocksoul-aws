import { mkdir, readFile, writeFile, cp, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import crypto from 'node:crypto';

export interface FileBackupManifest {
  format: 1;
  createdAt: string;
  source: string;
  files: Array<{ path: string; bytes: number; sha256: string }>;
}

async function digest(file: string): Promise<{ bytes: number; sha256: string }> {
  const content = await readFile(file);
  return { bytes: content.byteLength, sha256: crypto.createHash('sha256').update(content).digest('hex') };
}

export async function backupFileStore(sourceDir: string, backupDir: string): Promise<FileBackupManifest> {
  const source = resolve(sourceDir);
  const target = resolve(backupDir);
  await mkdir(target, { recursive: true });
  const names = (await readdir(source)).filter((name) => name === 'universe-store.json');
  const files: FileBackupManifest['files'] = [];
  for (const name of names) {
    const sourceFile = join(source, name);
    const targetFile = join(target, name);
    await cp(sourceFile, targetFile, { force: true });
    const stats = await digest(targetFile);
    files.push({ path: name, ...stats });
  }
  const manifest: FileBackupManifest = { format: 1, createdAt: new Date().toISOString(), source, files };
  await writeFile(join(target, 'manifest.json'), JSON.stringify(manifest, null, 2));
  return manifest;
}

export async function restoreFileStore(backupDir: string, targetDir: string): Promise<FileBackupManifest> {
  const source = resolve(backupDir);
  const target = resolve(targetDir);
  const manifest = JSON.parse(await readFile(join(source, 'manifest.json'), 'utf8')) as FileBackupManifest;
  if (manifest.format !== 1 || !Array.isArray(manifest.files)) throw new Error('BACKUP_MANIFEST_INVALID');
  await mkdir(target, { recursive: true });
  for (const entry of manifest.files) {
    const sourceFile = join(source, entry.path);
    const targetFile = join(target, entry.path);
    const actual = await digest(sourceFile);
    if (actual.bytes !== entry.bytes || actual.sha256 !== entry.sha256) throw new Error(`BACKUP_CHECKSUM_MISMATCH:${entry.path}`);
    await cp(sourceFile, targetFile, { force: false, errorOnExist: true });
  }
  return manifest;
}
