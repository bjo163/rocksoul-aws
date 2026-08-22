import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import { createDefaultSemanticProvider } from '../src/ai/provider.js';
import { buildAiAnalysis } from '../src/ai/general-analyzer.js';

const provider=createDefaultSemanticProvider(process.cwd());

test('core RGBL and 13 OUT magnitude no longer come from action-semantics registry', async()=>{
  const source=fs.readFileSync('src/ai/semantic-engine.ts','utf8');
  assert.equal(source.includes('data/registries/action-semantics.json'),false);
  const obs=await provider.analyze('Seorang pegawai menerima suap untuk meloloskan izin.');
  assert.equal(obs.revelationSignals.pureRevelationInputs,true);
  assert.ok(obs.intention.rgbl.R<0);
  assert.equal(obs.intention.rgbl.G,0);
  const axes=obs.revelationSignals.impactAxes.filter((x:any)=>x.relevance>0).map((x:any)=>x.label);
  assert.ok(axes.includes('PROPERTY'));
  assert.ok(axes.includes('JUSTICE'));
  assert.equal(obs.legacyBridge.magnitudeUsed,false);
});

test('restoration is a separate Light signal and does not erase historical violation semantics', async()=>{
  const obs=await provider.analyze('Saya menemukan dompet orang lain lalu mengembalikannya kepada pemilik.');
  assert.ok(obs.intention.rgbl.G>0);
  assert.ok(obs.intention.rgbl.L>0);
  assert.ok(obs.revelationSignals.impactAxes.some((x:any)=>x.label==='REPAIR'&&x.relevance>0));
});

test('Blue is epistemic grounding and is not counted as moral benefit', async()=>{
  const obs=await provider.analyze('Saya mengecek sumber sebelum membagikan klaim.');
  const result=buildAiAnalysis('Saya mengecek sumber sebelum membagikan klaim.',{semanticObservation:obs});
  assert.ok(obs.intention.rgbl.B>0);
  assert.equal(result.mizan.assessment.rgblRoles.blueGrounding,obs.intention.rgbl.B);
  assert.equal(result.mizan.assessment.accountabilityScore,0);
});

test('unresolved modern action receives zero Revelation magnitude and zero OUT vector', async()=>{
  const obs=await provider.analyze('Saya rutin merokok setelah bekerja.');
  assert.equal(obs.revelationBinding.status,'EMPIRICAL_BRIDGE_REQUIRED');
  assert.equal(obs.revelationSignals.magnitude,0);
  assert.deepEqual(obs.impactVector,[0,0,0,0,0,0,0,0,0,0,0,0,0]);
  const result=buildAiAnalysis('Saya rutin merokok setelah bekerja.',{semanticObservation:obs});
  assert.equal(result.revelationScorecard.analyticalScore,null);
});

test('analytical score magnitude is Revelation-grounded but formula remains engineering', async()=>{
  const obs=await provider.analyze('Ia mengambil barang milik orang lain dan menyimpannya.');
  const result=buildAiAnalysis('Ia mengambil barang milik orang lain dan menyimpannya.',{semanticObservation:obs});
  assert.equal(result.revelationScorecard.scoreComposition.analyticalMagnitudeSource,'REVELATION_GROUNDED_STRUCTURAL_FEATURES_WITH_ENGINEERING_FORMULA');
  assert.equal(result.revelationScorecard.scoreComposition.revelationGroundedMagnitudeInputs,true);
  assert.equal(result.revelationScorecard.scoreComposition.pureAnalyticalScore,false);
  assert.equal(result.revelationScorecard.invariants.legacyActionMagnitudeUsed,false);
});
