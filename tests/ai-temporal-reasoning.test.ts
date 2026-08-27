import assert from 'node:assert/strict';
import test from 'node:test';
import { buildAiAnalysis } from '../src/ai/general-analyzer.js';
import { calculateTemporalState, toMizanTemporalContext } from '../packages/tse-engine/src/index.ts';

const context = toMizanTemporalContext(calculateTemporalState({ timestamp: '2026-08-28T03:00:00+07:00', location: { latitude: -6.21, longitude: 107.27, timezone: 'Asia/Jakarta' }, nightModel: 'SUNSET_TO_SUNRISE' }));
const observation = { action: 'PRAYER', mode: 'REFLECTION', confidence: 0.8, intention: { rgbl: { R: 0, G: 0.4, B: 0.8, L: 0 } }, actionGateVector: Array(9).fill(0), impactVector: Array(13).fill(0), timeFactor: context, evidence: [], status: 'INFERRED' };

for (const question of ['berapa pahala doa jam 3?', 'jam berapa pahala paling besar?', 'jam berapa waktu terbaik?', 'jam kejahatan?', 'apakah jam tertentu pasti berdosa?']) {
  test(`AI preserves theological boundary: ${question}`, () => {
    const result = buildAiAnalysis(question, { semanticObservation: observation });
    assert.equal(result.temporalReasoning.classification, 'THEOLOGICAL_BOUNDARY');
    assert.match(result.temporalReasoning.boundary, /cannot determine literal pahala/i);
    assert.equal(result.temporalReasoning.researchHypotheses.automaticBaseScoreBonus, false);
  });
}
