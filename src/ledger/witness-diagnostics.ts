import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { verifySignedCheckpoint } from './distributed-witness.js';
import type { WitnessDag } from './witness-dag.js';
import type { SingleNodeWitnessKeyStore } from './single-node-keystore.js';
import type { LocalCheckpointStore } from './local-checkpoint-store.js';
import type { WitnessBackupManager } from './witness-backup.js';

export type WitnessHealthState = 'HEALTHY' | 'DEGRADED' | 'FAILED';

export async function runWitnessDiagnostics(input: {
  dataDir: string;
  dag: WitnessDag;
  keyStore: SingleNodeWitnessKeyStore;
  checkpoints: LocalCheckpointStore;
  backups: WitnessBackupManager;
}): Promise<{
  state: WitnessHealthState;
  checkedAt: string;
  checks: Record<string, { ok: boolean; detail?: unknown }>;
}> {
  const checks: Record<string, { ok: boolean; detail?: unknown }> = {};
  const dag = input.dag.verify();
  checks.qdagIntegrity = { ok: dag.valid, detail: dag };

  const active = input.keyStore.activeRecord();
  checks.signingKey = { ok: Boolean(active), detail: active ? { keyId: active.keyId, status: active.status, algorithm: active.algorithm } : 'NO_ACTIVE_KEY' };

  const keyFile = path.join(input.dataDir, 'witness', 'keystore.json.enc');
  try { await access(keyFile); const raw = await readFile(keyFile, 'utf8'); checks.encryptedKeystore = { ok: raw.includes('ciphertext') && !raw.includes('PRIVATE KEY') }; }
  catch { checks.encryptedKeystore = { ok: false, detail: 'KEYSTORE_MISSING' }; }

  const keys = input.keyStore.list();
  const checkpointItems = input.checkpoints.list();
  const invalid = checkpointItems.filter((signed) => {
    const key = keys.find((k) => k.witnessId === signed.witnessId && k.publicKey === signed.publicKey);
    return !key || !verifySignedCheckpoint(signed, key.publicKey);
  });
  checks.checkpointSignatures = { ok: invalid.length === 0, detail: { total: checkpointItems.length, invalid: invalid.length } };

  const backups = await input.backups.list();
  if (backups.length === 0) checks.recoveryBackup = { ok: false, detail: 'NO_BACKUP_YET' };
  else {
    const latest = await input.backups.verify(backups[0].directory);
    checks.recoveryBackup = { ok: latest.valid, detail: { backupId: latest.manifest.backupId, createdAt: latest.manifest.createdAt, failures: latest.failures } };
  }

  const hardFailure = !checks.qdagIntegrity.ok || !checks.encryptedKeystore.ok || !checks.checkpointSignatures.ok;
  const degraded = !checks.signingKey.ok || !checks.recoveryBackup.ok;
  return { state: hardFailure ? 'FAILED' : degraded ? 'DEGRADED' : 'HEALTHY', checkedAt: new Date().toISOString(), checks };
}
