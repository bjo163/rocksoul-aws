import assert from 'node:assert/strict';
import test from 'node:test';
import { explainLegalResult, explainTemporalContext } from '../src/index.ts';

test('temporal explanation stays analytical and exposes astronomical context', () => {
  const result = explainTemporalContext('cek konteks waktu', {
    schema: 'MIZAN_TEMPORAL_CONTEXT_V1',
    timestampUtc: '2026-01-01T00:00:00.000Z',
    temporalState: { solar: { altitudeDeg: 3 }, lunar: { illuminationFraction: 0.5 }, night: { segment: 'NIGHT' } },
    signals: { confidence: 0.8 },
    provenance: { provider: 'test' },
  });
  assert.equal(result?.classification, 'TEMPORAL_CONTEXT');
  assert.equal(result?.astronomicalFacts.solar?.altitudeDeg, 3);
  assert.equal(result?.researchHypotheses.automaticBaseScoreBonus, false);
  assert.match(result?.boundary ?? '', /not a measure of divine reward/);
});

test('theological language receives a boundary explanation', () => {
  const result = explainTemporalContext('waktu terbaik untuk pahala', { schema: 'MIZAN_TEMPORAL_CONTEXT_V1' });
  assert.equal(result?.classification, 'THEOLOGICAL_BOUNDARY');
  assert.match(result?.boundary ?? '', /cannot determine literal pahala/);
});

test('invalid temporal context is unresolved', () => {
  assert.equal(explainTemporalContext('hello', {}), null);
});

test('legal explanation formats existing analysis without issuing a verdict', () => {
  const result = explainLegalResult({ query: 'example', jurisdiction: 'ID', action: 'REVIEW', legal: { status: 'REVIEW_REQUIRED', religious: { sourceAuthority: 'QURAN' }, civil: { note: 'consult counsel' } }, semantic: { asma: { primary: { name: 'Al-Hakim' } } } });
  assert.deepEqual(result, { query: 'example', jurisdiction: 'ID', classification: 'REVIEW', legalStatus: 'REVIEW_REQUIRED', religiousAuthority: 'QURAN', civilRule: 'consult counsel', semanticPrimary: 'Al-Hakim', note: 'This is a decision-support explanation, not legal advice or a judicial verdict.' });
});
