import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd());

test('Personal OS has REAL as the only operational mode', async () => {
  const modes = JSON.parse(fs.readFileSync(path.join(root,'data/modes.json'), 'utf8'));
  assert.equal(modes.defaultMode, 'REAL');
  assert.ok(modes.modes.includes('REAL'));
  assert.ok(!modes.modes.includes('SIMULATION'));
});

test('Shadow scenarios default to REAL', async () => {
  const modulePath = fs.existsSync(path.join(root,'dist/src/shadow/shadow.js')) ? path.join(root,'dist/src/shadow/shadow.js') : path.join(root,'src/shadow/shadow.js');
  const m = await import(modulePath);
  const s = m.createPersonalScenario({ operatorRid:'RID-TEST', shadowId:'SHD-TEST' });
  assert.equal(s.mode,'REAL');
});

test('Canonical runtime has no simulation-only flag', async () => {
  const files = [
    'src/shadow/shadow.ts','src/engines/prophetic.ts','src/engines/governance.ts','src/engines/observer.ts',
    'src/engines/khilafah.ts','src/engines/space.ts','src/durability/scenario.ts','data/prophets.json','data/modes.json'
  ];
  for (const rel of files) {
    const txt = fs.readFileSync(path.join(root,rel),'utf8');
    assert.ok(!txt.includes('SIMULATION_ONLY'), rel);
  }
});
