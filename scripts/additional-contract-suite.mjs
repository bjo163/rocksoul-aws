import { spawnSync } from 'node:child_process';

const tests = [
  'tests/api-pagination-contract.test.ts',
  'tests/api-error-envelope-contract.test.ts',
  'tests/auth-replay-contract.test.ts',
  'tests/observability-redaction-contract.test.ts',
  'tests/observability-metrics-contract.test.ts',
  'tests/backup-retention-contract.test.ts',
  'tests/worker-lease-contract.test.ts',
  'tests/release-changelog-contract.test.ts',
  'tests/api-method-contract.test.ts',
  'tests/environment-contract.test.ts',
];

const result = spawnSync(process.execPath, ['scripts/transpile-runner.mjs', ...tests], {
  stdio: 'inherit',
  env: process.env,
});

process.exit(result.status ?? 1);
