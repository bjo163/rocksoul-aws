import { AwsIcrcAdapter } from '../packages/orchestrator/src/aws/icrc-adapter.js';
import { AwsUntcAdapter } from '../packages/orchestrator/src/aws/untc-adapter.js';

const target = process.argv[2];

if (!target || !['icrc-gciv', 'untc-genocide'].includes(target)) {
  console.error('Usage: npm run aws:source:probe -- <icrc-gciv|untc-genocide>');
  process.exitCode = 2;
} else {
  const snapshot =
    target === 'icrc-gciv'
      ? await new AwsIcrcAdapter().fetchGciv()
      : await new AwsUntcAdapter().fetchGenocideConvention();

  process.stdout.write(JSON.stringify(snapshot, null, 2) + '\n');
}
