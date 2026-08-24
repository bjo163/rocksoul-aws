import { runtimeDataset } from '../persistence/runtime-data.js';

export interface LawlessnessInput {
  context?: { exceptionIds?: string[]; lawless?: boolean };
  factors?: { lawless?: boolean };
}
export interface LawlessnessException { id: string; name: string; enabled: boolean; }
export interface LawlessnessProfile { lawless: boolean; exceptions: string[]; }

const getExceptions = (): LawlessnessException[] => runtimeDataset('data/exceptions.json') as LawlessnessException[];

export function lawlessnessProfile(amal: LawlessnessInput): LawlessnessProfile {
  const ids = new Set(amal.context?.exceptionIds ?? []);
  return {
    lawless: Boolean(amal.context?.lawless) || Boolean(amal.factors?.lawless),
    exceptions: getExceptions().filter((exception) => exception.enabled && ids.has(exception.id)).map((exception) => exception.id),
  };
}
