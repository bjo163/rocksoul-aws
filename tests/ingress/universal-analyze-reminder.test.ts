import test from 'node:test';
import assert from 'node:assert/strict';

test('universal analyze contract declares reminder bundle shape', () => {
  const shape = {
    id: 'CASE-TEST',
    kind: 'ANALYSIS',
    reminderBundle: {
      quran: { reference: '35:43' },
      asma: [{ name: 'Ar-Raqib' }, { name: 'Al-Khaliq' }],
      previousScripture: { book: 'TAWRAT', referenceStatus: 'TEXT_CORPUS_REQUIRED' },
      temporalContext: { patternId: 'TIME-SUN-DECLINE', mode: 'CONTEXT_ONLY' }
    }
  };
  assert.equal(shape.kind, 'ANALYSIS');
  assert.equal(shape.reminderBundle.asma.length, 2);
  assert.equal(shape.reminderBundle.previousScripture.referenceStatus, 'TEXT_CORPUS_REQUIRED');
});
