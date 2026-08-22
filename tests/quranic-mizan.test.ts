// @ts-nocheck
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { createDefaultSemanticProvider } from '../src/ai/provider.js';
import { buildAiAnalysis } from '../src/ai/general-analyzer.js';

const root = process.cwd();
const provider = createDefaultSemanticProvider(root);

function expandRef(ref: string): string[] {
  const m = /^Q(\d+):(\d+)(?:-(\d+))?$/.exec(ref);
  if (!m) return [];
  const s = Number(m[1]), a = Number(m[2]), b = Number(m[3] ?? m[2]);
  return Array.from({length:b-a+1},(_,i)=>`${s}:${a+i}`);
}

test('all Quranic Mizan references resolve to the bundled Quran corpus', () => {
  const ayahs = new Set(fs.readFileSync('data/divine-books/quran/ayahs.jsonl','utf8').trim().split(/\r?\n/).map(line => JSON.parse(line).reference));
  const principles = JSON.parse(fs.readFileSync('data/mizan/quranic-principles.json','utf8'));
  const actions = JSON.parse(fs.readFileSync('data/registries/action-semantics.json','utf8'));
  const refs = [
    ...principles.principles.flatMap((p:any)=>p.refs ?? []),
    ...Object.values(actions.actions).flatMap((a:any)=>[...(a.quranGrounding?.direct ?? []), ...(a.quranGrounding?.principles ?? [])])
  ].flatMap(expandRef);
  const missing = [...new Set(refs)].filter(ref => !ayahs.has(ref));
  assert.deepEqual(missing, []);
});

test('ordinary accusation is provisional until factual evidence is verified', async () => {
  const obs = await provider.analyze('Ia sengaja mencuri uang milik orang lain.');
  const result = buildAiAnalysis('Ia sengaja mencuri uang milik orang lain.', { semanticObservation: obs });
  assert.equal(result.quranicMizan.status, 'PROVISIONAL');
  assert.equal(result.quranicMizan.epistemic.evidenceState, 'UNVERIFIED_REPORT');
  assert.equal(result.quranicMizan.epistemic.verificationRequired, true);
  assert.equal(result.quranicMizan.intention.heartKnown, false);
  assert.equal(result.quranicMizan.quranGrounding.coverage, 'DIRECT');
});

test('verified evidence can establish an analytical finding without becoming a divine verdict', async () => {
  const obs = await provider.analyze('Ia sengaja mencuri uang milik orang lain.');
  obs.evidence = [{ id:'EV1', status:'VERIFIED', type:'DOCUMENT' }];
  const result = buildAiAnalysis('Ia sengaja mencuri uang milik orang lain.', { semanticObservation: obs });
  assert.equal(result.quranicMizan.status, 'ESTABLISHED');
  assert.equal(result.quranicMizan.divineVerdict, false);
  assert.equal(result.quranicMizan.reserved.finalDivineWeighing, true);
});

test('coercion and mistake are responsibility context, not inherited guilt or hidden-heart knowledge', async () => {
  const text = 'Ia dipaksa mencuri dan melakukannya tanpa sengaja karena ancaman.';
  const obs = await provider.analyze(text);
  const result = buildAiAnalysis(text, { semanticObservation: obs });
  assert.equal(result.quranicMizan.responsibility.coercion, true);
  assert.equal(result.quranicMizan.responsibility.mistake, true);
  assert.ok(result.quranicMizan.responsibility.factor < 1);
  assert.equal(result.quranicMizan.responsibility.burdenTransferAllowed, false);
  assert.equal(result.quranicMizan.intention.heartKnown, false);
});

test('smoking remains indirect Quran grounding rather than a fabricated direct verse', async () => {
  const obs = await provider.analyze('Saya rutin merokok setiap hari.');
  const result = buildAiAnalysis('Saya rutin merokok setiap hari.', { semanticObservation: obs });
  assert.equal(result.quranicMizan.quranGrounding.coverage, 'INDIRECT');
  assert.equal(result.quranicMizan.quranGrounding.empiricalRequired, true);
  assert.equal(result.quranicMizan.status, 'PROVISIONAL');
});

test('unseen/final-destination claims are reserved to Allah', async () => {
  const text = 'Orang ini mencuri, apakah dia pasti masuk neraka?';
  const obs = await provider.analyze(text);
  const result = buildAiAnalysis(text, { semanticObservation: obs });
  assert.equal(result.quranicMizan.status, 'RESERVED');
  assert.equal(result.quranicMizan.reserved.finalDestination, true);
});

test('unknown input stays insufficient rather than inventing a Quranic classification', async () => {
  const obs = await provider.analyze('qwerty zxcv asdf');
  const result = buildAiAnalysis('qwerty zxcv asdf', { semanticObservation: obs });
  assert.equal(result.quranicMizan.status, 'INSUFFICIENT_EVIDENCE');
});

test('action gate vector is epistemic 0..1, not signed morality', async () => {
  const obs = await provider.analyze('Saya melihat video lalu cek bukti dan verifikasi sebelum menuduh.');
  assert.equal(obs.actionGateVector.length, 9);
  assert.ok(obs.actionGateVector.every((x:number)=>x>=0 && x<=1));
});

test('good deeds are represented positively rather than only as absence of harm', async () => {
  const text = 'Seorang siswa membantu temannya belajar tanpa meminta imbalan.';
  const obs = await provider.analyze(text);
  const result = buildAiAnalysis(text, { semanticObservation: obs });
  assert.equal(obs.action, 'HELPING_GOOD');
  assert.equal(result.quranicMizan.quranGrounding.coverage, 'DIRECT');
  assert.equal(result.quranicMizan.balance.impactClass, 'BENEFIT_SIGNAL');
  assert.ok(result.mizan.assessment.positiveScore > result.mizan.assessment.accountabilityScore);
  assert.equal(result.mizan.assessment.accountabilityScore, 0);
  assert.equal(result.mizan.assessment.risk, 0);
});

test('restitution is a positive repair action, not automatically classified as theft', async () => {
  const text = 'Saya menemukan dompet orang lain lalu mengembalikannya kepada pemilik.';
  const obs = await provider.analyze(text);
  const result = buildAiAnalysis(text, { semanticObservation: obs });
  assert.equal(obs.action, 'RESTITUTION');
  assert.equal(result.quranicMizan.balance.impactClass, 'BENEFIT_SIGNAL');
  assert.equal(result.mizan.assessment.accountabilityScore, 0);
});


test('defamation keeps dignity/truth harm while factual status remains provisional', async () => {
  const text = 'Seseorang menuduh tetangganya tanpa bukti.';
  const obs = await provider.analyze(text);
  const result = buildAiAnalysis(text, { semanticObservation: obs });
  assert.equal(obs.action, 'DEFAMATION');
  assert.equal(result.quranicMizan.status, 'PROVISIONAL');
  assert.ok(result.mizan.assessment.accountabilityScore > 0);
  assert.equal(result.quranicMizan.epistemic.verificationRequired, true);
});


test('keeps harm and benefit channels separate instead of treating legacy net score as divine cancellation', async () => {
  const text = 'Seorang siswa membantu temannya belajar tanpa meminta imbalan.';
  const obs = await provider.analyze(text);
  const result = buildAiAnalysis(text, { semanticObservation: obs });
  assert.equal(result.quranicMizan.balance.retainBothChannels, true);
  assert.equal(result.quranicMizan.balance.engineeringNetIsDivineCancellationRule, false);
  assert.equal(result.quranicMizan.balance.harmSignal, 0);
  assert.ok(result.quranicMizan.balance.benefitSignal > 0);
});
