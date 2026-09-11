import assert from 'node:assert/strict';
import { initializeRuntimeData, runtimeDatasetPaths, REQUIRED_RUNTIME_DATASETS } from '@moonwitness/persistence';
import { createPersistence } from '../packages/persistence/src/factory.js';
import { seedIntoPersistenceStore, loadSeedManifest } from '../packages/persistence/src/bootstrap.js';
import { verifyRevelationCorpusFiles, verifyRevelationSeedDatabase, buildRevelationDerivedIndexes, verifyRevelationDerivedIndexes, loadRevelationCorpusManifest } from '../src/revelation/corpus/revelation-seed.js';
import { fourBookCorpusSnapshot } from '../src/revelation/corpus/four-book-corpus.js';
import { runRevelationTenCaseSmoke } from '../src/revelation/verification/ten-case.js';

const root=process.cwd();
const fileVerification=verifyRevelationCorpusFiles(root);
assert.equal(fileVerification.ok,true);
const corpusManifest=loadRevelationCorpusManifest(root);
const expectedTotal=Object.values(corpusManifest.books).reduce((sum,book)=>sum+book.recordCount,0);
assert.equal(fileVerification.totalExpected,expectedTotal);
assert.equal(fileVerification.totalActual,expectedTotal);

const seedManifest=await loadSeedManifest(root);
for(const book of Object.values(corpusManifest.books)){
  const source=seedManifest.sources.find(row=>row.id===book.seedSourceId);
  assert.ok(source,`missing seed source ${book.seedSourceId}`);
  assert.equal(source?.path,book.path);
  assert.equal(source?.entityType,book.entityType);
  assert.equal(source?.format,'jsonl');
  assert.equal(source?.kind,'structured');
}

const store=createPersistence({driver:'memory'});
try {
  const seeded=await seedIntoPersistenceStore(root,store,'memory');
  assert.ok(seeded.seeded>=expectedTotal);
  const seedVerification=await verifyRevelationSeedDatabase(store.entityRepository(),root);
  assert.equal(seedVerification.ok,true);
  assert.equal(seedVerification.totalExpected,expectedTotal);
  assert.equal(seedVerification.totalSeeded,expectedTotal);

  await initializeRuntimeData(store.entityRepository(),{postgres:true});
  const paths=new Set(runtimeDatasetPaths());
  for(const required of REQUIRED_RUNTIME_DATASETS) assert.equal(paths.has(required),true,`runtime dataset missing ${required}`);
  const four=fourBookCorpusSnapshot(root);
  assert.equal(four.totalPassages,expectedTotal);
  assert.deepEqual(four.fullTextBooks,['QURAN','TAWRAT','ZABUR','INJIL']);
  assert.equal(four.books.TAWRAT.runtimeSource,'SEEDED_RUNTIME_DB_OR_FALLBACK');

  const build=await buildRevelationDerivedIndexes(store.entityRepository(),root);
  assert.equal(build.ok,true);
  const indexes=await verifyRevelationDerivedIndexes(store.entityRepository(),root);
  assert.equal(indexes.ok,true);
  assert.equal(indexes.indexes.some((x:any)=>x.id==='REVELATION-INDEX::EVENT-INTERPRETER'&&x.eventProfileMatches===true),true);
  assert.equal(indexes.indexes.some((x:any)=>x.id==='REVELATION-INDEX::GRAMMAR'&&x.grammarProfileMatches===true),true);
  assert.equal(indexes.indexes.some((x:any)=>x.id==='REVELATION-INDEX::DIVINE-ONTOLOGY'&&x.ontologyProfileMatches===true),true);

  const smoke=await runRevelationTenCaseSmoke(root);
  assert.equal(smoke.ok,true);
  assert.equal(smoke.summary.passed,10);
  console.log(JSON.stringify({ok:true,expectedTotal,seeded,seedVerification,indexes,smoke:smoke.summary},null,2));
} finally { await store.close(); }
