import { spawnSync } from 'node:child_process';

const steps = [
  ['lint', ['run', 'lint']],
  ['dependency integrity', ['run', 'dependency:integrity']],
  ['typecheck', ['run', 'typecheck']],
  ['release identity', ['run', 'release:identity']],
  ['core tests', ['test']],
  ['final certification', ['run', 'final:certify']],
];

for (const [name, args] of steps) {
  console.log(`\n=== ${name} ===`);
  const result = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', args, {
    stdio: 'inherit',
    shell: false,
  });
  if (result.status !== 0) {
    console.error(`\nRELEASE CHECK FAILED: ${name}`);
    process.exit(result.status ?? 1);
  }
}

console.log('\nRELEASE CHECK: READY');
