#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const tests = [
  'tests/sql-boundary-contract.test.ts',
  'tests/api-entity-boundary-contract.test.ts',
  'tests/http-security-contract.test.ts',
  'tests/auth-session-contract.test.ts',
  'tests/api-cookie-session.test.ts',
  'tests/sdk-session-contract.test.ts',
  'tests/backend-production-boundary.test.ts',
  'tests/production-certification-contract.test.ts',
  'tests/shared-ui-contract.test.ts',
  'tests/ui-accessibility-contract.test.ts',
  'tests/governed-ui-contract.test.ts',
  'tests/xrp-flow-contract.test.ts',
  'tests/human-review-gate.test.ts',
  'tests/review-workflow.test.ts',
  'tests/witness-dag.test.ts',
  'tests/distributed-witness.test.ts',
  'tests/single-node-witness.test.ts',
];

const result = spawnSync(process.execPath, ['scripts/transpile-runner.mjs', ...tests], {
  cwd: process.cwd(),
  stdio: 'inherit',
});

if (result.error) throw result.error;
process.exit(result.status ?? 1);
