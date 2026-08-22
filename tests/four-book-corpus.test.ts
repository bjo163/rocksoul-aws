import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fourBookCorpusSnapshot } from '../src/revelation/corpus/four-book-corpus.js';
import { fourBookCorroboration } from '../src/revelation/corroboration/four-book-corroboration.js';
import { corroborationSourceGuard } from '../src/revelation/scripture-source-policy.js';

const snapshot=fourBookCorpusSnapshot(process.cwd());
assert.equal(snapshot.books.QURAN.availability,'FULL_TEXT');
assert.equal(snapshot.books.QURAN.verseRecords,6236);
const expectedCounts:{[k:string]:number}={TAWRAT:5852,ZABUR:2461,INJIL:3779};
for(const book of ['TAWRAT','ZABUR','INJIL'] as const){
  assert.equal(snapshot.books[book].availability,'FULL_TEXT_TEXTUAL_WITNESS');
  assert.equal(snapshot.books[book].verseRecords,expectedCounts[book]);
  assert.equal(snapshot.books[book].normativeDirectionEligible,false);
  assert.equal(snapshot.books[book].corroborationEligible,true);
  assert.equal(snapshot.books[book].channelWeight,1);
}
assert.deepEqual(snapshot.activeBooks,['QURAN','TAWRAT','ZABUR','INJIL']);
assert.equal(snapshot.invariants.witnessMayCreateStandaloneMoralDirection,false);
assert.equal(snapshot.invariants.witnessTextMayOnlyCorroborate,true);
assert.equal(corroborationSourceGuard({book:'TAWRAT',sourceClass:'TEXTUAL_WITNESS'}).allowed,true);
const realCorroboration=fourBookCorroboration({text:'love lord',quranRefs:['Q5:8'],queryPhrases:['love lord'],root:process.cwd()});
assert.ok(realCorroboration.matchedWitnessBooks>=1);
assert.ok(realCorroboration.confidenceBoost>0);
assert.equal(realCorroboration.policy.witnessCanCreateMoralDirection,false);


// A root without witness text falls back to the structured reference index and contributes zero score.
const indexRoot=fs.mkdtempSync(path.join(os.tmpdir(),'mw-fourbook-index-'));
const indexOnly=fourBookCorroboration({text:'truth justice mercy',quranRefs:['Q4:135'],queryPhrases:['truth justice mercy'],root:indexRoot});
assert.equal(indexOnly.confidenceBoost,0);
assert.equal(indexOnly.matchedWitnessBooks,0);
assert.ok(['TAWRAT','ZABUR','INJIL'].every(book=>indexOnly.channels[book].status==='INDEX_ONLY_NO_SCORE'));
fs.rmSync(indexRoot,{recursive:true,force:true});

// Mechanics-only fixture proves equal-channel corroboration behavior without claiming fixture text is scripture.
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'mw-fourbook-'));
for(const book of ['tawrat','zabur','injil']){
  const dir=path.join(tmp,'data/divine-books/witness-corpora'); fs.mkdirSync(dir,{recursive:true});
  fs.writeFileSync(path.join(dir,`${book}.jsonl`),JSON.stringify({ref:'TEST 1:1',text:'truth justice mercy',sourceClass:'TEXTUAL_WITNESS',fixtureOnly:true})+'\n');
}
const active=fourBookCorroboration({text:'truth justice mercy',quranRefs:['Q4:135'],queryPhrases:['truth justice mercy'],root:tmp});
assert.equal(active.matchedWitnessBooks,3);
assert.equal(active.corroborationRatio,1);
assert.equal(active.confidenceBoost,0.3);
assert.ok(['TAWRAT','ZABUR','INJIL'].every(book=>active.channels[book].contribution===1));
assert.equal(active.policy.witnessCanCreateMoralDirection,false);
assert.equal(active.policy.witnessCanReverseQuranDirection,false);
fs.rmSync(tmp,{recursive:true,force:true});

console.log(JSON.stringify({ok:true,activeBooks:snapshot.activeBooks,verseCounts:expectedCounts,realWitnessBoost:realCorroboration.confidenceBoost,indexOnlyBoost:indexOnly.confidenceBoost,fixtureBoost:active.confidenceBoost},null,2));
