import assert from 'node:assert/strict';
import test from 'node:test';
import { createCosmicEngine } from '../packages/cosmic-engine/src/index.ts';

test('engine facade supports Moonwitness integration without UI or platform state', async () => {
  const engine = createCosmicEngine(process.cwd());
  const result = await engine.analyze('Saya memeriksa sumber sebelum membagikan klaim.', {
    timestamp: '2026-08-28T03:00:00+07:00',
    location: { latitude: -6.21, longitude: 107.27, timezone: 'Asia/Jakarta' },
    nightModel: 'SUNSET_TO_SUNRISE',
  });
  assert.equal(result.mizan?.timeFactor?.schema, 'MIZAN_TEMPORAL_CONTEXT_V1');
  assert.equal(result.temporalReasoning?.astronomicalFacts?.timestampUtc, '2026-08-27T20:00:00.000Z');
});
