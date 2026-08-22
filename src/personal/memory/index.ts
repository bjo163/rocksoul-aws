// @ts-nocheck
export function createMemory({memoryId, rid, type='FACT', content, source=null, confidence=0.5, visibility='PRIVATE'}={}) {
  if(!memoryId||!rid||!content) throw new Error('memoryId, rid and content are required');
  return {memoryId,rid,type,content,source,confidence,visibility,createdAt:new Date().toISOString()};
}
export function scoreMemory(memory,{decay=0}={}) { return Math.max(0, Math.min(1, Number(memory.confidence||0)-decay)); }
