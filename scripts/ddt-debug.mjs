import { spawnSync } from 'node:child_process';
import fs from 'node:fs';

const args = process.argv.slice(2);
const env = { ...process.env };
const selected = {};

for (const arg of args) {
  if (arg.startsWith('--from=')) selected.DDT_FROM = arg.slice('--from='.length);
  else if (arg.startsWith('--to=')) selected.DDT_TO = arg.slice('--to='.length);
  else if (arg.startsWith('--ids=')) selected.DDT_IDS = arg.slice('--ids='.length);
  else throw new Error(`Unknown argument: ${arg}`);
}

Object.assign(env, selected, {
  MW_RATE_LIMIT_PER_MINUTE: env.MW_DDT_RATE_LIMIT_PER_MINUTE ?? '100000',
  MW_AUTH_RATE_LIMIT_PER_MINUTE: env.MW_DDT_AUTH_RATE_LIMIT_PER_MINUTE ?? '100000',
  MW_AI_RATE_LIMIT_PER_MINUTE: env.MW_DDT_AI_RATE_LIMIT_PER_MINUTE ?? '100000',
  MW_WRITE_RATE_LIMIT_PER_MINUTE: env.MW_DDT_WRITE_RATE_LIMIT_PER_MINUTE ?? '100000',
  NODE_ENV: 'test',
});

const run = (command, commandArgs, extraEnv = env) => {
  const result = spawnSync(command, commandArgs, { stdio: 'inherit', env: extraEnv });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
};

run('npm', ['--prefix', 'apps/api', 'run', 'build']);

for (const file of fs.readdirSync('apps/api/tests')) {
  if (file.startsWith('test-cases-') && file.endsWith('.json')) {
    fs.copyFileSync(`apps/api/tests/${file}`, `apps/api/dist/apps/api/tests/${file}`);
  }
}

run('node', ['--test', 'apps/api/dist/apps/api/tests/api-data-driven.test.js']);
