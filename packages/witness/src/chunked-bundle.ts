import { createHash } from 'node:crypto';
import type { WitnessBundle } from './distributed-witness.js';

export interface WitnessBundleChunk { version:1; bundleId:string; index:number; total:number; payload:string; hash:string }
const h=(s:string)=>createHash('sha256').update(s).digest('hex');
export function chunkWitnessBundle(bundle: WitnessBundle, maxBytes=64*1024): WitnessBundleChunk[] {
  if(maxBytes<256) throw new Error('CHUNK_SIZE_TOO_SMALL');
  const encoded=Buffer.from(JSON.stringify(bundle)).toString('base64'); const chunks:string[]=[];
  for(let i=0;i<encoded.length;i+=maxBytes) chunks.push(encoded.slice(i,i+maxBytes));
  return chunks.map((payload,index)=>({version:1,bundleId:bundle.bundleId,index,total:chunks.length,payload,hash:h(`${bundle.bundleId}:${index}:${payload}`)}));
}
export function assembleWitnessBundle(chunks: WitnessBundleChunk[]): WitnessBundle {
  if(!chunks.length) throw new Error('BUNDLE_CHUNKS_REQUIRED'); const sorted=[...chunks].sort((a,b)=>a.index-b.index); const first=sorted[0];
  if(sorted.some((c,i)=>c.version!==1||c.bundleId!==first.bundleId||c.total!==sorted.length||c.index!==i||c.hash!==h(`${c.bundleId}:${c.index}:${c.payload}`))) throw new Error('BUNDLE_CHUNK_INTEGRITY_FAILED');
  return JSON.parse(Buffer.from(sorted.map(c=>c.payload).join(''),'base64').toString('utf8')) as WitnessBundle;
}
