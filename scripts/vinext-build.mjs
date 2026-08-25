import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const appRoot = resolve(repoRoot, 'apps/web');
const vinextCli = resolve(appRoot, 'node_modules/vinext/dist/cli.js');
const requiredArtifacts = [
  'dist/server/BUILD_ID',
  'dist/server/index.js',
  'dist/client/vinext-client-entry-manifest.json',
];

async function runBuild() {
  let output = '';
  const child = spawn(process.execPath, [vinextCli, 'build', ...process.argv.slice(2)], {
    cwd: appRoot,
    env: process.env,
    stdio: ['inherit', 'pipe', 'pipe'],
    windowsHide: true,
  });

  for (const [stream, destination] of [[child.stdout, process.stdout], [child.stderr, process.stderr]]) {
    stream.on('data', (chunk) => {
      const text = chunk.toString();
      output = (output + text).slice(-64 * 1024);
      destination.write(chunk);
    });
  }

  return new Promise((resolveResult, reject) => {
    child.on('error', reject);
    child.on('close', (code, signal) => resolveResult({ code, signal, output }));
  });
}

let result = await runBuild();
const artifactsExist = () => requiredArtifacts.every((file) => existsSync(resolve(appRoot, file)));

if (result.code !== 0 && result.output.includes('[vinext] No build output found in') && artifactsExist()) {
  console.warn('[build:web] Vinext prerender started before fresh artifacts were visible; retrying once.');
  result = await runBuild();
}

if (result.code === 0) process.exitCode = 0;
else {
  const windowsHandleCloseCrash = process.platform === 'win32'
    && /Assertion failed: !\(handle->flags & UV_HANDLE_CLOSING\), file src\\win\\async\.c, line \d+/.test(result.output);
  const buildIsComplete = result.output.includes('Build complete. Run `vinext start`') && artifactsExist();

  if (windowsHandleCloseCrash && buildIsComplete) {
    console.warn('[build:web] Vinext artifacts verified; ignoring the known Node 24+ Windows libuv shutdown crash.');
    process.exitCode = 0;
  } else {
    if (result.signal) console.error(`[build:web] Vinext terminated by signal ${result.signal}.`);
    process.exitCode = result.code ?? 1;
  }
}
