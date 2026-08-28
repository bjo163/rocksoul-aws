import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { restoreFileStore } from '../packages/persistence/src/file-backup.js';

function arg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const hit = process.argv.find((x) => x.startsWith(prefix));
  return hit?.slice(prefix.length);
}

function run(command: string, args: string[], env: NodeJS.ProcessEnv): Promise<number> {
  return new Promise((resolveExit, reject) => {
    const child = spawn(command, args, { stdio: 'inherit', env, shell: false });
    child.on('error', reject);
    child.on('exit', (code, signal) => resolveExit(signal ? 1 : (code ?? 1)));
  });
}

const driver = process.env.STORAGE_DRIVER ?? 'file';
const source = arg('source');
if (!source) throw new Error('Usage: db-restore --source=BACKUP_PATH [--target=RESTORE_DIR]');

if (driver === 'postgres') {
  if (!process.argv.includes('--allow-destructive')) {
    throw new Error('POSTGRES_RESTORE_REQUIRES_ALLOW_DESTRUCTIVE: restore only into an isolated maintenance database');
  }
  const file = resolve(source);
  const args = ['--format=custom', '--clean', '--if-exists', '--no-owner', '--no-privileges'];
  const databaseUrl = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
  if (databaseUrl) args.push('--dbname', databaseUrl);
  else args.push('--host', process.env.PGHOST ?? 'localhost', '--port', process.env.PGPORT ?? '5432', '--username', process.env.PGUSER ?? 'postgres', '--dbname', process.env.PGDATABASE ?? 'moonwitness');
  args.push(file);
  const exit = await run('pg_restore', args, process.env);
  if (exit !== 0) throw new Error(`pg_restore failed with exit code ${exit}`);
  console.log(JSON.stringify({ ok: true, driver: 'postgres', restoredFrom: file }, null, 2));
} else {
  const target = resolve(arg('target') ?? './data/runtime-restored');
  console.log(JSON.stringify({ ok: true, driver, ...(await restoreFileStore(resolve(source), target)) }, null, 2));
}
