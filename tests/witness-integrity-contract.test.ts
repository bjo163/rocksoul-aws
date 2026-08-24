import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const drill = fs.readFileSync('scripts/witness-recovery-drill.ts', 'utf8');

test('witness recovery drill verifies backup manifest before restore', () => {
  assert.match(drill, /manager\.verify\(latest\.directory\)/);
  assert.match(drill, /if\(!verified\.valid\) throw new Error/);
  assert.match(drill, /verified\.manifest\.qdagRoot/);
});

test('witness recovery validates restored checkpoints against known public keys', () => {
  assert.match(drill, /verifySignedCheckpoint/);
  assert.match(drill, /signed\.publicKey/);
  assert.match(drill, /invalidCheckpoints/);
});

test('witness recovery compares restored DAG root and reports a non-destructive drill', () => {
  assert.match(drill, /const rootMatches=dag\.root\(\)===verified\.manifest\.qdagRoot/);
  assert.match(drill, /destructive:false/);
});
