// @ts-nocheck
import { runtimeDataset } from '../persistence/runtime-data.js';
const getExceptions = () => runtimeDataset('data/exceptions.json') as any[];
export function lawlessnessProfile(amal){const exceptions=getExceptions();const ids=amal.context?.exceptionIds??[]; return {lawless:Boolean(amal.context?.lawless)||Boolean(amal.factors?.lawless),exceptions:exceptions.filter(x=>x.enabled&&ids.includes(x.id)).map(x=>x.id)};}
