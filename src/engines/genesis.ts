// @ts-nocheck
import { runtimeDataset } from '../persistence/runtime-data.js';
const getSources=()=>runtimeDataset('data/4-sources.json') as any[];
const getGateways=()=>runtimeDataset('data/7-gateways.json') as any[];
const getProcesses=()=>runtimeDataset('data/4-processes.json') as any[];
export function validateGenesis({sourceId,gatewayId,processId}) {
  const sources=getSources(), gateways=getGateways(), processes=getProcesses();
  if(!sources.some(x=>x.id===sourceId)) throw new Error('Invalid source');
  if(!gateways.some(x=>x.id===gatewayId)) throw new Error('Invalid gateway');
  if(!processes.some(x=>x.id===processId)) throw new Error('Invalid process');
  return {sourceId,gatewayId,processId,valid:true};
}
