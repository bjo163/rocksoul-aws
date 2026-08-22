import assert from 'node:assert/strict';
import test from 'node:test';
import { revelationLifecycleSnapshot } from '../src/revelation/lifecycle/revelation-lifecycle.js';

test('v4.28 lifecycle grounding is discovered from Revelation corpus without manual verse ids',()=>{
  const snap=revelationLifecycleSnapshot(process.cwd());
  assert.equal(snap.protocol,'REVELATION_MORAL_LIFECYCLE_GROUNDING_V1');
  assert.equal(snap.invariants.divineAcceptanceComputed,false);
  assert.equal(snap.invariants.finalForgivenessComputed,false);
  assert.equal(snap.invariants.restorationErasesHistoricalViolation,false);
  for(const stage of ['RETURN_REPENTANCE','REPAIR','RESTITUTION','PERSISTENCE']){
    assert.ok(Array.isArray(snap.stages[stage]?.quranRefs));
    assert.ok(snap.stages[stage].quranRefs.length>0,`${stage} should retrieve Quran references from anchors`);
  }
  for(const stage of Object.values(snap.stages) as any[]){
    for(const ref of stage.quranRefs) assert.match(ref,/^Q\d+:\d+$/);
  }
});
