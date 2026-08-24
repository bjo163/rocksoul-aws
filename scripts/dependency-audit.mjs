import { writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const result = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['audit', '--omit=dev', '--audit-level=critical', '--json'], {
  encoding: 'utf8',
  maxBuffer: 20 * 1024 * 1024,
});

const output = result.stdout || '';
writeFileSync('npm-audit.json', output, 'utf8');

let report;
try {
  report = JSON.parse(output);
} catch {
  console.error('npm audit did not return valid JSON.');
  if (result.stderr) console.error(result.stderr);
  process.exit(result.status ?? 1);
}

const vulnerabilities = report?.metadata?.vulnerabilities ?? {};
const total = Number(vulnerabilities.total ?? 0);
const high = Number(vulnerabilities.high ?? 0);
const critical = Number(vulnerabilities.critical ?? 0);
console.log(`npm audit: ${total} total production vulnerabilities; high=${high}; critical=${critical}`);

if (high > 0 || critical > 0) {
  process.exit(1);
}

if ((result.status ?? 0) !== 0) {
  console.warn('npm audit returned a non-zero status, but no high/critical production vulnerability was reported.');
}
