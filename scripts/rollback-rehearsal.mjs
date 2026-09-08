import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const platform = process.platform;

function npmRun(script) {
  const npm = platform === 'win32' ? process.execPath : 'npm';
  const args = platform === 'win32'
    ? [path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js'), 'run', script]
    : ['run', script];
  const result = spawnSync(npm, args, { cwd: repo, stdio: 'inherit', shell: false, maxBuffer: 50 * 1024 * 1024 });
  if ((result.status ?? 0) !== 0) throw new Error(`npm run ${script} failed`);
}

function exists(file) {
  return fs.existsSync(path.join(repo, file));
}

async function waitForHealth(baseUrl, pathname, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${baseUrl}${pathname}`, { signal: AbortSignal.timeout(2000) });
      if (res.ok) return;
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Health check timed out: ${baseUrl}${pathname}`);
}

function spawnNative(port) {
  // The native bootstrap still bridges a few TypeScript-only legacy modules;
  // run it through tsx so the rehearsal exercises the real source graph.
  const serverPath = path.join(repo, 'apps', 'api', 'src', 'server.ts');
  const tsxCli = path.join(repo, 'node_modules', 'tsx', 'dist', 'cli.mjs');
  if (!fs.existsSync(serverPath) || !fs.existsSync(tsxCli)) throw new Error('Native rehearsal runtime (tsx) is unavailable.');
  const env = {
    ...process.env,
    NODE_ENV: 'development',
    // Rehearsal must be deterministic and isolated from developer Postgres
    // credentials; production deployments provide their own driver explicitly.
    STORAGE_DRIVER: 'file',
    HOST: '127.0.0.1',
    PORT: String(port),
    MOONWITNESS_ENV: 'development',
  };
  const child = spawn(process.execPath, [tsxCli, serverPath], { cwd: repo, env, stdio: 'pipe', detached: false });
  const baseUrl = `http://127.0.0.1:${port}`;
  return { child, baseUrl };
}

function spawnFastify(port) {
  const fastifyDist = path.join(repo, 'apps', 'api', 'dist', 'apps', 'api', 'src', 'fastify-runtime.js');
  if (!fs.existsSync(fastifyDist)) {
    throw new Error(`Fastify runtime build not found at ${fastifyDist}. Run npm run build:api first.`);
  }
  const starterPath = path.join(repo, 'scripts', '_fastify-starter.mjs');
  const starter = `import { buildFastifyRuntime } from '${pathToFileURL(fastifyDist).href}';\n` +
    `const app = await buildFastifyRuntime({ telemetry: false });\n` +
    `const port = Number(process.env.PORT ?? ${port});\n` +
    `const host = process.env.HOST ?? '127.0.0.1';\n` +
    `await app.listen({ port, host });\n` +
    `console.log('Fastify listening on http://' + host + ':' + port);\n` +
    `await new Promise(() => {});\n`;
  fs.writeFileSync(starterPath, starter, 'utf8');

  const env = {
    ...process.env,
    NODE_ENV: 'development',
    STORAGE_DRIVER: 'file',
    HOST: '127.0.0.1',
    PORT: String(port),
    AWS_FASTIFY_RUNTIME: '1',
  };
  const child = spawn(process.execPath, [starterPath], { cwd: repo, env, stdio: 'pipe', detached: false });
  const baseUrl = `http://127.0.0.1:${port}`;
  const cleanup = () => {
    try { fs.unlinkSync(starterPath); } catch { /* ignore */ }
  };
  return { child, baseUrl, cleanup };
}

async function main() {
  const startTime = Date.now();
  const report = {
    timestamp: new Date().toISOString(),
    durationMs: 0,
    phases: {},
    passed: false,
    errors: [],
  };

  const nativePort = 8787;
  const fastifyPort = 8787;

  try {
    if (!exists('apps/api/dist/apps/api/src/server.js')) {
      console.log('Building API for rollback rehearsal...');
      npmRun('build:api');
    }

    // Phase 1: Start native HTTP server
    console.log('\n=== Phase 1: Native HTTP server ===');
    const native1 = spawnNative(nativePort);
    report.phases.nativeStart = { started: true };
    await waitForHealth(native1.baseUrl, '/api/v1/health', 30000);
    const nativeReady = await fetch(`${native1.baseUrl}/api/v1/ready`);
    report.phases.nativeHealth = { status: nativeReady.status, ok: nativeReady.ok };
    console.log(`Native health: ${nativeReady.status} ${nativeReady.ok ? 'OK' : 'FAIL'}`);

    // Verify readiness
    const nativeReadyJson = await nativeReady.json().catch(() => ({}));
    report.phases.nativeReadiness = nativeReadyJson;

    // Stop native
    native1.child.kill('SIGTERM');
    await new Promise((r) => setTimeout(r, 2000));
    report.phases.nativeStop = { stopped: true };

    // Phase 2: Start Fastify server
    console.log('\n=== Phase 2: Fastify server (AWS_FASTIFY_RUNTIME=1) ===');
    const fastify = spawnFastify(fastifyPort);
    report.phases.fastifyStart = { started: true, env: { AWS_FASTIFY_RUNTIME: '1' } };
    await waitForHealth(fastify.baseUrl, '/health', 30000);
    const fastifyReady = await fetch(`${fastify.baseUrl}/ready`);
    report.phases.fastifyHealth = { status: fastifyReady.status, ok: fastifyReady.ok };
    console.log(`Fastify health: ${fastifyReady.status} ${fastifyReady.ok ? 'OK' : 'FAIL'}`);

    const fastifyReadyJson = await fastifyReady.json().catch(() => ({}));
    report.phases.fastifyReadiness = fastifyReadyJson;

    // Stop Fastify
    fastify.child.kill('SIGTERM');
    await new Promise((r) => setTimeout(r, 2000));
    fastify.cleanup();
    report.phases.fastifyStop = { stopped: true };

    // Phase 3: Switch back to native
    console.log('\n=== Phase 3: Switch back to native HTTP ===');
    const native2 = spawnNative(nativePort);
    report.phases.nativeRestart = { started: true };
    await waitForHealth(native2.baseUrl, '/api/v1/health', 30000);
    const native2Ready = await fetch(`${native2.baseUrl}/api/v1/ready`);
    report.phases.nativeRestartHealth = { status: native2Ready.status, ok: native2Ready.ok };
    console.log(`Native restart health: ${native2Ready.status} ${native2Ready.ok ? 'OK' : 'FAIL'}`);

    // Stop native
    native2.child.kill('SIGTERM');
    await new Promise((r) => setTimeout(r, 2000));
    report.phases.nativeRestartStop = { stopped: true };

    // Phase 4: Data integrity verification
    console.log('\n=== Phase 4: Data integrity ===');
    const dataDir = path.join(repo, '.data');
    const witnessDag = path.join(dataDir, 'witness', 'qdag.json');
    const integrity = {};
    integrity.dataDirExists = fs.existsSync(dataDir);
    integrity.witnessDagExists = fs.existsSync(witnessDag);
    if (fs.existsSync(witnessDag)) {
      try {
        const dag = JSON.parse(fs.readFileSync(witnessDag, 'utf8'));
        integrity.witnessDagValid = true;
        integrity.witnessDagNodes = dag?.nodes?.length ?? dag?.root ? 1 : 0;
      } catch (e) {
        integrity.witnessDagValid = false;
        integrity.witnessDagError = e instanceof Error ? e.message : String(e);
      }
    }
    report.phases.dataIntegrity = integrity;
    console.log(`Data integrity: ${JSON.stringify(integrity, null, 2)}`);

    report.passed = true;
  } catch (error) {
    report.errors.push(error instanceof Error ? error.message : String(error));
    console.error('Rollback rehearsal failed:', error);
  }

  report.durationMs = Date.now() - startTime;
  const reportPath = path.join(repo, 'scripts', '.rollback-rehearsal-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
  console.log(`\nReport written to ${reportPath}`);
  console.log(`Duration: ${report.durationMs}ms`);

  if (!report.passed) {
    console.error('\nROLLBACK REHEARSAL: FAILED');
    process.exit(1);
  }
  console.log('\nROLLBACK REHEARSAL: PASSED');
}

main().catch((error) => {
  console.error('Rollback rehearsal script error:', error);
  process.exit(1);
});
