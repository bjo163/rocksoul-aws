import assert from 'node:assert/strict';
import test from 'node:test';
import { createCosmicEngine } from '../packages/cosmic-engine/src/index.ts';

test('createCosmicEngine exposes unified operations (analyze, query, evaluate, explain, execute)', async () => {
  const cosmic = createCosmicEngine({
    logLevel: 'info',
    storage: { type: 'memory' }
  });

  assert.equal(cosmic.config.logLevel, 'info');
  assert.equal(cosmic.config.storage?.type, 'memory');

  // 1. Analyze operation with object parameter
  const analysis = await cosmic.analyze({
    text: 'Pengembalian titipan amanah dilakukan setelah verifikasi bukti kepemilikan.',
    temporalInput: {
      timestamp: '2026-08-28T03:00:00+07:00',
      location: { latitude: -6.21, longitude: 107.27, timezone: 'Asia/Jakarta' },
      nightModel: 'SUNSET_TO_SUNRISE',
    }
  });
  assert.ok(analysis);
  assert.ok(analysis.intent);
  assert.ok(analysis.mizan);

  // 2. Query operation (Semantic concept query)
  const semanticQuery = await cosmic.query({
    type: 'SEMANTIC',
    concept: 'AMANAH_INTEGRITY'
  });
  assert.equal(semanticQuery.type, 'SEMANTIC');
  assert.equal(semanticQuery.query, 'AMANAH_INTEGRITY');
  assert.ok(semanticQuery.observation);
  assert.equal(semanticQuery.observation.protocol, 'COSMIC_SEMANTIC_OBSERVATION_V1');

  // 3. Query operation (Temporal query)
  const temporalQuery = await cosmic.query({
    type: 'TEMPORAL',
    temporal: {
      timestamp: '2026-08-28T12:00:00+07:00',
      location: { latitude: -6.21, longitude: 107.27, timezone: 'Asia/Jakarta' },
      nightModel: 'SUNSET_TO_SUNRISE',
    }
  });
  assert.equal(temporalQuery.type, 'TEMPORAL');
  assert.ok(temporalQuery.temporal);
  assert.ok(typeof (temporalQuery.temporal as any).solar?.altitudeDeg === 'number');

  // 4. Evaluate operation (Mizan evaluation)
  const mizanEval = await cosmic.evaluate({
    type: 'MIZAN',
    payload: {
      semantic: { R: 0.8, G: 0.1, B: 0.9, L: 0.1 },
      context: { verified: true }
    }
  });
  assert.ok(mizanEval);
  assert.equal((mizanEval as Record<string, unknown>).modelOnly, true);

  // 5. Explain operation (Temporal context explanation)
  const explanation = await cosmic.explain({
    type: 'TEMPORAL',
    text: 'Doa tengah malam',
    timeFactor: { timestamp: '2026-08-28T03:00:00+07:00' }
  });
  assert.ok(explanation === null || typeof explanation === 'object');

  // 6. Execute operation (Workflow dispatch)
  const execution = await cosmic.execute('EVIDENCE_ATTACHMENT', {
    caseId: 'CASE-FACADE-001',
    evidenceId: 'EVD-FACADE-001',
  });
  assert.equal(execution.workflow, 'EVIDENCE_ATTACHMENT');
  assert.equal(execution.status, 'ACCEPTED');
  assert.ok(execution.executedAt);
});
