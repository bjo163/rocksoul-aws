import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { buildApp } from '../src/app.js';

test('native HTTP API exposes the universal kernel', async () => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mw-api-'));
  const app = await buildApp({ dataDir, persistenceDriver: 'file' });
  try {
    await app.start(0, '127.0.0.1');
    const address = app.server.address();
    assert.ok(address && typeof address === 'object');
    const base = `http://127.0.0.1:${address.port}`;
    const response = await fetch(`${base}/api/v1/health`);
    assert.equal(response.status, 200);
    const body = await response.json() as { ok: boolean; kernel: boolean; ledger: boolean; environment: string; storageDriver: string; release: string };
    assert.equal(body.ok, true);
    assert.equal(body.kernel, true);
    assert.equal(body.ledger, true);
    assert.ok(body.environment);
    assert.equal(body.storageDriver, 'file');
    assert.equal(body.release, '4.33.0');
  } finally {
    await app.close();
    await fs.rm(dataDir, { recursive: true, force: true });
  }
});

test('native HTTP API exposes deployment readiness', async () => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mw-api-ready-'));
  const app = await buildApp({ dataDir, persistenceDriver: 'file' });
  try {
    await app.start(0, '127.0.0.1');
    const address = app.server.address();
    assert.ok(address && typeof address === 'object');
    const response = await fetch(`http://127.0.0.1:${address.port}/api/v1/ready`);
    assert.equal(response.status, 200);
    const body = await response.json() as { status: string; release: string; storageDriver: string };
    assert.equal(body.status, 'ready');
    assert.equal(body.release, '4.33.0');
    assert.equal(body.storageDriver, 'file');
  } finally {
    await app.close();
    await fs.rm(dataDir, { recursive: true, force: true });
  }
});

test('native HTTP API serves AI analysis without fabricating lifecycle grounding', async () => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mw-api-ai-'));
  const app = await buildApp({ dataDir, persistenceDriver: 'file' });
  try {
    await app.start(0, '127.0.0.1');
    const address = app.server.address();
    assert.ok(address && typeof address === 'object');
    const response = await fetch(`http://127.0.0.1:${address.port}/api/v1/ai/analyze`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        text: 'test semantic event',
        semanticObservation: {
          action: 'SEMANTIC_ACTION',
          domainVector: { TEST: 0.8 },
          semantic: { R: -0.2, G: -0.1, B: 0.3, L: -0.1 },
          actionGateVector: [0.1, 0.2, 0, 0, 0.3, 0.4, 0.5, 0.2, 0.1],
          impactVector: [0.1, 0.1, 0.1, 0.1, 0.2, 0.3, 0.2, 0.3, 0.4, 0.2, 0.1, 0.1, 0.1],
          timeFactor: { dimension: 21, status: 'OBSERVED', confidence: 0.9 },
          causality: { causal_strength: 0.6, causal_confidence: 0.8 },
          evidence: [{ type: 'E', reference: 'TEST:1' }],
        },
      }),
    });
    assert.equal(response.status, 200);
    const body = await response.json() as { mizan?: unknown; semantic?: unknown; lifecycle?: unknown };
    assert.ok(body.mizan);
    assert.ok(body.semantic);
    assert.ok(Object.prototype.hasOwnProperty.call(body, 'lifecycle'));
    assert.equal(body.lifecycle, null);
  } finally {
    await app.close();
    await fs.rm(dataDir, { recursive: true, force: true });
  }
});
