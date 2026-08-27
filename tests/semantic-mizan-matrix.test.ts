import assert from 'node:assert/strict';
import test from 'node:test';
import { createDefaultSemanticProvider } from '../src/ai/semantic-engine.js';
import { evaluateMizanService } from '../src/services/mizan-service.js';

const provider = createDefaultSemanticProvider(process.cwd());
type SemanticSnapshot = {
  epistemicSignals?: { coercion?: boolean; mistake?: boolean; responsibilityFactor?: number };
  actionGateVector?: unknown[];
  actionCandidates: Array<{ action?: string }>;
  eventGraph?: { summary?: { restorationCount?: number } };
  action?: string;
  revelationSignals?: { rgbl?: Record<string, number> };
  intention?: { rgbl?: Record<string, number> };
  semanticVector?: Record<string, unknown>;
  impactVector?: number[];
  timeFactor?: Record<string, unknown>;
  causality?: Record<string, unknown>;
  domainVector?: Record<string, number>;
  evidence?: unknown[];
  confidence?: number;
  quality?: number;
  scale?: Record<string, unknown>;
  status?: string;
};

test('semantic to Mizan matrix preserves contextual distinctions', async (t) => {
  const cases = [
    { name: 'smoking', text: 'Saya merokok 10 batang sehari.', expectedAction: 'SMOKING', context: (s: SemanticSnapshot) => assert.equal(s.epistemicSignals?.coercion, false) },
    { name: 'helping', text: 'Saya membantu teman belajar tanpa meminta imbalan.', expectedAction: 'HELPING_GOOD', context: (s: SemanticSnapshot) => assert.equal(s.epistemicSignals?.mistake, false) },
    { name: 'verification', text: 'Saya memeriksa sumber sebelum membagikan sebuah klaim.', expectedAction: 'VERIFY_CLAIM', context: (s: SemanticSnapshot) => assert.ok(Array.isArray(s.actionGateVector)) },
    { name: 'lying', text: 'Saya berbohong kepada pelanggan tentang kondisi barang.', expectedAction: 'LYING', context: (s: SemanticSnapshot) => assert.ok(s.actionCandidates.length > 0) },
    { name: 'taking', text: 'Saya mengambil barang milik orang lain dan menyimpannya.', expectedAction: 'THEFT', context: (s: SemanticSnapshot) => assert.equal(s.epistemicSignals?.mistake, false) },
    { name: 'restitution', text: 'Saya mengambil barang orang lain lalu mengembalikannya kepada pemilik.', expectedAction: 'RESTITUTION', context: (s: SemanticSnapshot) => assert.ok(s.eventGraph?.summary?.restorationCount > 0 || s.action === 'RESTITUTION') },
    { name: 'coercion', text: 'Saya dipaksa menyerahkan barang itu.', context: (s: SemanticSnapshot) => assert.equal(s.epistemicSignals?.coercion, true) },
    { name: 'mistake', text: 'Saya tidak sengaja mengambil barang orang lain.', context: (s: SemanticSnapshot) => assert.equal(s.epistemicSignals?.mistake, true) },
  ];

  for (const item of cases) {
    await t.test(item.name, async () => {
      const semantic = await provider.analyze(item.text) as SemanticSnapshot;
      assert.ok(semantic);
      assert.equal(typeof semantic.status, 'string');
      if (item.expectedAction) assert.ok(semantic.actionCandidates.some((candidate) => candidate.action === item.expectedAction) || semantic.action === item.expectedAction, `${item.name}: expected ${item.expectedAction}`);
      item.context(semantic);
      const mizan = evaluateMizanService({
        semantic: semantic.revelationSignals?.rgbl ?? semantic.intention?.rgbl ?? { R: 0, G: 0, B: 0, L: 0 },
        semanticVector: semantic.semanticVector,
        actionGateVector: semantic.actionGateVector,
        impactVector: semantic.impactVector,
        timeFactor: semantic.timeFactor,
        causality: semantic.causality,
        domainVector: semantic.domainVector,
        semanticObservation: semantic,
        evidenceCount: Array.isArray(semantic.evidence) ? semantic.evidence.length : 0,
        confidence: Number(semantic.confidence ?? 0),
        evidenceQuality: Number(semantic.quality ?? 0),
        scale: semantic.scale,
        factors: { responsibility: Number(semantic.epistemicSignals?.responsibilityFactor ?? 0) },
      });
      assert.equal(typeof mizan.assessment?.accountabilityScore, 'number');
      assert.equal(typeof mizan.assessment?.confidence, 'number');
    });
  }
});
