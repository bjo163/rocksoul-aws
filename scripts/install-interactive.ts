import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { randomBytes } from 'node:crypto';
import { writeFile, chmod, access } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { loadRevelationCorpusManifest } from '../src/revelation/corpus/revelation-seed.js';

const rl = createInterface({ input, output });

async function ask(question: string, fallback = ''): Promise<string> {
  const suffix = fallback ? ` [${fallback}]` : '';
  const answer = (await rl.question(`${question}${suffix}: `)).trim();
  return answer || fallback;
}

async function askYesNo(question: string, fallback = true): Promise<boolean> {
  const hint = fallback ? 'Y/n' : 'y/N';
  const answer = (await rl.question(`${question} [${hint}]: `)).trim().toLowerCase();
  if (!answer) return fallback;
  return ['y', 'yes'].includes(answer);
}

async function askSecret(question: string): Promise<string> {
  if (!input.isTTY || !output.isTTY) return ask(question);
  output.write(`${question}: `);
  return await new Promise<string>((resolve, reject) => {
    let value = '';
    const onData = (chunk: Buffer | string) => {
      const text = String(chunk);
      if (text.includes('\n') || text.includes('\r')) {
        input.setRawMode?.(false);
        input.pause();
        input.off('data', onData);
        output.write('\n');
        resolve(value);
      } else if (text === '\u0003') {
        input.setRawMode?.(false);
        input.off('data', onData);
        reject(new Error('Cancelled'));
      } else if (text === '\u007f') {
        value = value.slice(0, -1);
      } else {
        value += text;
      }
    };
    input.resume();
    input.setRawMode?.(true);
    input.on('data', onData);
  });
}

function run(command: string, args: string[], env: NodeJS.ProcessEnv): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit', env, shell: false });
    child.on('error', reject);
    child.on('exit', (code, signal) => resolve(signal ? 1 : (code ?? 1)));
  });
}

const root = process.cwd();
const existing = process.env;

try {
  console.log('\nMoonWitness OS — Interactive PostgreSQL Installer\n');
  console.log('This wizard configures PostgreSQL, runs migration + typed Revelation seed, builds derived Asma/Moral indexes, runs the 10-case Revelation smoke suite, then verifies the installed state.');
  console.log('It does not store secrets in tracked repository files.\n');

  if (!(await access(path.join(root, 'node_modules')).then(() => true).catch(() => false))) {
    throw new Error('node_modules not found. Run `npm install` first.');
  }

  const driver = (await ask('Storage driver', 'postgres')).toLowerCase();
  if (driver !== 'postgres') {
    console.log(`\nNon-PostgreSQL driver selected: ${driver}`);
    const proceed = await askYesNo('Continue with local/test installation', true);
    if (!proceed) throw new Error('Installation cancelled.');
    const env = { ...existing, STORAGE_DRIVER: driver };
    const pre = await run(process.execPath, ['scripts/transpile-exec.mjs', 'scripts/preflight.ts'], env);
    if (pre !== 0) throw new Error('Preflight failed.');
    const install = await run(process.execPath, ['scripts/transpile-exec.mjs', 'scripts/db-install.ts'], env);
    if (install !== 0) throw new Error('Installation failed.');
    rl.close();
    process.exit(0);
  }

  const host = await ask('PostgreSQL host', process.env.PGHOST || 'localhost');
  const port = await ask('PostgreSQL port', process.env.PGPORT || '5432');
  const database = await ask('PostgreSQL database', process.env.PGDATABASE || 'moonwitness');
  const user = await ask('PostgreSQL user', process.env.PGUSER || 'postgres');
  const password = await askSecret('PostgreSQL password');
  if (!password) throw new Error('PostgreSQL password cannot be empty.');

  const generateJwt = await askYesNo('Generate a secure JWT secret now', true);
  const jwtSecret = generateJwt ? randomBytes(48).toString('base64url') : await askSecret('JWT secret');
  if (jwtSecret.length < 32) throw new Error('JWT secret must be at least 32 characters.');

  const revelationManifest=loadRevelationCorpusManifest(root);
  const revelationPassages=Object.values(revelationManifest.books).reduce((sum,book)=>sum+book.recordCount,0);
  const seed = await askYesNo(`Install/verify full seed including ${revelationPassages.toLocaleString('en-US')} manifest-verified Revelation passages`, true);
  const bootstrapAdmin = await askYesNo('Create an ADMIN user after database installation', true);
  let adminUsername = '';
  let adminPassword = '';
  if (bootstrapAdmin) {
    adminUsername = await ask('Admin username', 'admin');
    adminPassword = await askSecret('Admin password');
    if (adminPassword.length < 12) throw new Error('Admin password must be at least 12 characters.');
  }

  const writeEnv = await askYesNo('Write these settings to .env.local (gitignored)', true);
  const env = {
    ...existing,
    STORAGE_DRIVER: 'postgres',
    PGHOST: host,
    PGPORT: port,
    PGDATABASE: database,
    PGUSER: user,
    PGPASSWORD: password,
    JWT_SECRET: jwtSecret,
    ...(seed ? {} : { SEED: '0' })
  };

  if (writeEnv) {
    const envText = [
      '# Generated by MoonWitness interactive installer',
      'STORAGE_DRIVER=postgres',
      `PGHOST=${host}`,
      `PGPORT=${port}`,
      `PGDATABASE=${database}`,
      `PGUSER=${user}`,
      `PGPASSWORD=${password.replaceAll('\\n', '\\n')}`,
      `JWT_SECRET=${jwtSecret}`,
      '',
    ].join('\n');
    const envPath = path.join(root, '.env.local');
    await writeFile(envPath, envText, { mode: 0o600 });
    try { await chmod(envPath, 0o600); } catch { /* Windows may ignore mode */ }
    console.log(`Saved local deployment settings to ${envPath}`);
  }

  console.log('\n[1/8] Connectivity preflight');
  if (await run(process.execPath, ['scripts/transpile-exec.mjs', 'scripts/db-postgres-check.ts'], env) !== 0) {
    throw new Error('PostgreSQL connectivity check failed. Verify host, port, database, user, and password.');
  }

  console.log('\n[2/8] Repository preflight');
  if (await run(process.execPath, ['scripts/transpile-exec.mjs', 'scripts/preflight.ts'], env) !== 0) {
    throw new Error('Repository preflight failed.');
  }

  console.log('\n[3/8] Migration + typed seed + corpus checksum verification + Revelation indexes + 10-case smoke test');
  if (await run(process.execPath, ['scripts/transpile-exec.mjs', 'scripts/db-install.ts'], env) !== 0) {
    throw new Error('Database installation failed. No success state is reported.');
  }

  console.log('\n[4/8] Full database reconciliation');
  if (await run(process.execPath, ['scripts/transpile-exec.mjs', 'scripts/db-verify.ts'], env) !== 0) {
    throw new Error('Database verification failed.');
  }

  console.log('\n[5/8] Runtime-data verification');
  if (await run(process.execPath, ['scripts/transpile-exec.mjs', 'scripts/db-runtime-verify.ts'], env) !== 0) {
    throw new Error('Runtime-data verification failed.');
  }

  const migrateLegacy = await askYesNo('Migrate legacy backend-state/audit-ledger/types files to PostgreSQL if they exist', true);
  if (migrateLegacy) {
    console.log('\n[6/8] Legacy backend state migration');
    if (await run(process.execPath, ['scripts/transpile-exec.mjs', 'scripts/backend-postgres-migrate.ts'], env) !== 0) {
      throw new Error('Legacy backend state migration failed.');
    }
  } else {
    console.log('\n[6/8] Legacy backend state migration skipped');
  }

  console.log('\n[7/8] Backend state verification');
  if (await run(process.execPath, ['scripts/transpile-exec.mjs', 'scripts/backend-state-verify.ts'], env) !== 0) {
    throw new Error('Backend PostgreSQL state verification failed.');
  }

  if (bootstrapAdmin) {
    console.log('\n[8/8] Admin bootstrap');
    const adminEnv = { ...env, MOONWITNESS_ADMIN_USERNAME: adminUsername, MOONWITNESS_ADMIN_PASSWORD: adminPassword };
    if (await run(process.execPath, ['scripts/transpile-exec.mjs', 'scripts/auth-bootstrap.ts'], adminEnv) !== 0) {
      throw new Error('Admin bootstrap failed.');
    }
  } else {
    console.log('\n[8/8] Admin bootstrap skipped');
  }

  console.log('\n✅ MoonWitness OS installation completed successfully.');
  console.log(`Storage: PostgreSQL ${host}:${port}/${database}`);
  console.log('Next: start the API with `npm run build:api` and your normal API start command.');
  console.log('Do not commit `.env.local`.');
} catch (error) {
  console.error(`\n❌ Installation stopped: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
} finally {
  rl.close();
}
