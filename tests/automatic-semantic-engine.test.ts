// @ts-nocheck
import assert from 'node:assert/strict';
import test from 'node:test';
import { analyzeTextAutomatic } from '../src/ai/analyzer.js';
import { RegistrySemanticProvider } from '../src/ai/provider.js';

const root = process.cwd();

test('automatic semantic engine is registry-driven and offline', async () => {
  const provider = new RegistrySemanticProvider(root);
  const result = await analyzeTextAutomatic('Pejabat menggunakan anggaran untuk keluarganya di Indonesia.', { provider, jurisdiction: 'ID' });
  assert.equal(result.mizan.actionGateVector.length, 9);
  assert.equal(result.mizan.impactVector.length, 13);
  assert.equal(result.intent, 'CORRUPTION');
  assert.equal(result.mizan.assessment.confidence >= 0.60, true);
  assert.equal(result.mizan.assessment.evidenceQuality >= 0.25, true);
  assert.equal(typeof result.mizan.assessment.risk, 'number');
  assert.equal(result.capability.semanticEngine, 'moonwitness-moral-lifecycle+event-graph+native-revelation-binding+revelation-grounded-rgbl-out+four-book-core');
});

test('unknown language remains unresolved rather than inventing a case', async () => {
  const provider = new RegistrySemanticProvider(root);
  const result = await analyzeTextAutomatic('qwerty asdfgh zxcvbn', { provider });
  assert.equal(result.intent, 'UNRESOLVED');
  assert.equal(result.mizan?.assessment.confidence <= 0.3, true);
  assert.equal(result.mizan?.assessment.uncertainty >= 0.7, true);
});

test('confidence does not increase Mizan risk by itself', async () => {
  const provider = new RegistrySemanticProvider(root);
  const high = await analyzeTextAutomatic('mencuri', { provider });
  const lowObservation = {
    ...high.semanticVector,
    confidence: 0.1,
    intention: { ...high.intention, confidence: 0.1 }
  };
  const { buildAiAnalysis } = await import('../src/ai/general-analyzer.js');
  const low = buildAiAnalysis('mencuri', { semanticObservation: lowObservation });
  const highRisk = Number(high.mizan.assessment.risk);
  const lowRisk = Number(low.mizan.assessment.risk);
  assert.equal(Math.round(highRisk * 1e6), Math.round(lowRisk * 1e6));
  assert.ok(Number(low.mizan.assessment.confidence) < Number(high.mizan.assessment.confidence));
});
