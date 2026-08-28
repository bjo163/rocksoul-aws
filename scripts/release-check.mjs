import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';

const npmCommand = process.platform === 'win32' ? process.execPath : 'npm';
const npmPrefix = process.platform === 'win32'
  ? [join(dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js')]
  : [];

const steps = [
  ['package build', ['run', 'build:packages']],
  ['package runtime smoke', ['run', 'test:package-runtime']],
  ['fastify transitional adapter', ['run', 'test:fastify-adapter']],
  ['architecture boundary', ['run', 'architecture:check']],
  ['lint', ['run', 'lint']],
  ['dependency integrity', ['run', 'dependency:integrity']],
  ['typecheck', ['run', 'typecheck']],
  ['engine typecheck', ['run', 'typecheck:engine']],
  ['documentation', ['run', 'docs:check']],
  ['release identity', ['run', 'release:identity']],
  ['core tests', ['test']],
  ['final certification', ['run', 'final:certify']],
];

for (const [name, args] of steps) {
  console.log(`\n=== ${name} ===`);
  const result = spawnSync(npmCommand, [...npmPrefix, ...args], {
    stdio: 'inherit',
    shell: false,
  });
  if (result.status !== 0) {
    console.error(`\nRELEASE CHECK FAILED: ${name}`);
    process.exit(result.status ?? 1);
  }
}

console.log('\nRELEASE CHECK: READY');
