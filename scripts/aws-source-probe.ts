import { AwsIcrcAdapter } from '../packages/orchestrator/src/aws/icrc-adapter.js';
import { AwsUntcAdapter } from '../packages/orchestrator/src/aws/untc-adapter.js';
import { AwsIcjAdapter } from '../packages/orchestrator/src/aws/icj-adapter.js';

const target = process.argv[2];

if (!target || !['icrc-gciv', 'untc-genocide', 'icj-bosnia-serbia'].includes(target)) {
  console.error('Usage: npm run aws:source:probe -- <icrc-gciv|untc-genocide|icj-bosnia-serbia>');
  process.exitCode = 2;
} else {
  const snapshot =
    target === 'icrc-gciv'
      ? await new AwsIcrcAdapter().fetchGciv()
      : target === 'untc-genocide'
        ? await new AwsUntcAdapter().fetchGenocideConvention()
        : await new AwsIcjAdapter().fetchBosniaSerbiaBundle();

  process.stdout.write(JSON.stringify(snapshot, null, 2) + '\n');
}
