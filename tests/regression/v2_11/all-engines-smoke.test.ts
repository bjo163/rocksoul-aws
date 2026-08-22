import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
const dir=fs.existsSync(path.resolve('dist/src/engines')) ? path.resolve('dist/src/engines') : path.resolve('src/engines');
const files=fs.readdirSync(dir).filter(f=>f.endsWith('.js')).filter(f=>!f.endsWith('.tmp')).sort();

test('all engine modules import successfully', async()=>{
  const results=[];
  for (const file of files) {
    const mod=await import(path.join(dir,file));
    results.push({file,exports:Object.keys(mod).length});
  }
  assert.equal(results.length, files.length);
  assert.ok(results.every(x=>x.exports>0));
  console.log(`PASS: imported ${results.length} engine modules`);
});
