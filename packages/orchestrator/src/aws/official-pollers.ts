import type { AwsIcrcAdapter } from './icrc-adapter.js';
import type { AwsUntcAdapter } from './untc-adapter.js';
import type { AwsIcjAdapter } from './icj-adapter.js';
import type { AwsSourcePollerRegistry } from './continuous-research.js';

export function createAwsOfficialSourcePollers(input: {
  icrc: AwsIcrcAdapter;
  untc: AwsUntcAdapter;
  icj: AwsIcjAdapter;
}): AwsSourcePollerRegistry {
  return {
    'icrc-gciv': () => input.icrc.fetchGciv(),
    'untc-genocide': () => input.untc.fetchGenocideConvention(),
    'icj-bosnia-serbia': () => input.icj.fetchBosniaSerbiaBundle(),
  };
}
