import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { backupFileStore } from '../packages/persistence/src/file-backup.js';

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
const target = resolve(arg('target') ?? `./data/backups/${new Date().toISOString().replace(/[:.]/g, '-')}`);
await mkdir(target, { recursive: true });

if (driver === 'postgres') {
  const file = resolve(target, 'moonwitness.dump');
  const args = ['--format=custom', '--file', file];
  const databaseUrl = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
  if (databaseUrl) args.push(databaseUrl);
  else {
    args.push('--host', process.env.PGHOST ?? 'localhost', '--port', process.env.PGPORT ?? '5432', '--username', process.env.PGUSER ?? 'postgres', '--dbname', process.env.PGDATABASE ?? 'moonwitness');
  }
  const exit = await run('pg_dump', args, process.env);
  if (exit !== 0) throw new Error(`pg_dump failed with exit code ${exit}`);
  console.log(JSON.stringify({ ok: true, driver: 'postgres', backup: file, format: 'custom' }, null, 2));
} else {
  const source = resolve(arg('source') ?? process.env.PERSISTENCE_DIR ?? './data/runtime');
  console.log(JSON.stringify({ ok: true, driver, ...(await backupFileStore(source, target)) }, null, 2));
}
