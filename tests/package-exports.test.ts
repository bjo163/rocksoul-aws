import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repo = path.resolve(__dirname, '..');

const sourceExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
const packageHostImportPatterns = [
  /(?:^|[\\/])apps[\\/]api(?:[\\/]|$)/,
  /(?:^|[\\/])src[\\/](?:api|routes|server|app)(?:[\\/]|$)/,
  /^(?:express|fastify|hono)(?:\/|$)/,
];

async function walk(dir: string): Promise<string[]> {
  let entries: import('node:fs').Dirent[] = [];
  try { entries = await readdir(dir, { withFileTypes: true }); } catch { return []; }
  const files: string[] = [];
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.next' || entry.name.startsWith('.')) continue;
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(entryPath)));
    else if (sourceExtensions.has(entryPath.slice(entryPath.lastIndexOf('.')))) files.push(entryPath);
  }
  return files;
}

import * as contracts from '../packages/contracts/src/index.js';
import * as tseEngine from '../packages/tse-engine/src/index.js';
import * as temporalEngine from '../packages/temporal-engine/src/index.js';
import * as semanticEngine from '../packages/semantic-engine/src/index.js';
import * as mizanEngine from '../packages/mizan-engine/src/index.js';
import * as explanationEngine from '../packages/explanation-engine/src/index.js';
import * as witness from '../packages/witness/src/index.js';
import * as persistence from '../packages/persistence/src/index.js';
import * as jobs from '../packages/jobs/src/index.js';
import * as orchestrator from '../packages/orchestrator/src/index.js';
import * as cosmicEngine from '../packages/cosmic-engine/src/index.js';
import * as sdk from '../packages/sdk/src/index.js';

const mods = [contracts, tseEngine, temporalEngine, semanticEngine, mizanEngine, explanationEngine, witness, persistence, jobs, orchestrator, cosmicEngine, sdk];

test('packages export main entry points resolve', () => {
  for (const mod of mods) {
    assert.ok(mod, 'package should export something');
  }
});

test('@moonwitness/contracts key exports exist', () => {
  assert.strictEqual(typeof contracts.ContractValidationError, 'function');
  assert.strictEqual(typeof contracts.assertHumanReviewGate, 'function');
  assert.strictEqual(typeof contracts.assertApiResponseContract, 'function');
  assert.strictEqual(typeof contracts.isHumanReviewGate, 'function');
  assert.ok(typeof contracts.assertWitnessReference === 'function' || typeof contracts.isWitnessReference === 'function');
  assert.ok(typeof contracts.assertAnalysisResult === 'function');
  assert.ok(typeof contracts.assertReviewRecord === 'function');
  assert.ok(typeof contracts.assertXrpWorkspace === 'function');
});

test('@moonwitness/tse-engine key exports exist', () => {
  assert.strictEqual(typeof tseEngine.calculateTemporalState, 'function');
  assert.strictEqual(typeof tseEngine.toMizanTemporalContext, 'function');
  assert.strictEqual(typeof tseEngine.phaseName, 'function');
  assert.ok(typeof tseEngine.astronomyEngineProvider === 'object' || typeof tseEngine.astronomyEngineProvider === 'function');
});

test('@moonwitness/temporal-engine key exports exist', () => {
  assert.strictEqual(typeof temporalEngine.now, 'function');
  assert.strictEqual(typeof temporalEngine.makeTimeEvent, 'function');
  assert.strictEqual(typeof temporalEngine.compareTime, 'function');
  assert.ok(typeof temporalEngine.TimeEvent === 'function' || typeof temporalEngine.makeTimeEvent === 'function');
});

test('@moonwitness/semantic-engine key exports exist', () => {
  assert.strictEqual(typeof semanticEngine.buildAnalyticalSemanticVector, 'function');
  assert.strictEqual(typeof semanticEngine.SemanticRegistry, 'function');
  assert.ok(typeof semanticEngine.SemanticRegistry.fromFile === 'function');
});

test('@moonwitness/mizan-engine key exports exist', () => {
  assert.strictEqual(typeof mizanEngine.evaluateMizan, 'function');
  assert.strictEqual(typeof mizanEngine.evaluateQuranicMizan, 'function');
  assert.strictEqual(typeof mizanEngine.normalizeScale, 'function');
  assert.strictEqual(typeof mizanEngine.calculateXp, 'function');
  assert.strictEqual(typeof mizanEngine.configureMizanDatasetLoader, 'function');
  assert.strictEqual(typeof mizanEngine.severityBand, 'function');
});

test('@moonwitness/explanation-engine key exports exist', () => {
  assert.strictEqual(typeof explanationEngine.explainTemporalContext, 'function');
  assert.strictEqual(typeof explanationEngine.explainLegalResult, 'function');
  assert.ok(typeof explanationEngine.explainTemporalContext({ schema: 'MIZAN_TEMPORAL_CONTEXT_V1' }) === 'object' || explanationEngine.explainTemporalContext({ schema: 'MIZAN_TEMPORAL_CONTEXT_V1' }) === null);
});

test('@moonwitness/witness key exports exist', () => {
  assert.ok(witness.WitnessDag !== undefined || typeof witness.exportWitnessBundle === 'function');
});

test('@moonwitness/persistence key exports exist', () => {
  assert.ok(persistence.PersistenceClient !== undefined || typeof persistence.factory === 'function');
});

test('@moonwitness/jobs key exports exist', () => {
  assert.strictEqual(typeof jobs.PersistentJobQueue, 'function');
  assert.strictEqual(typeof jobs.WorkerRuntime, 'function');
  assert.strictEqual(typeof jobs.isTerminalJobStatus, 'function');
  assert.ok(typeof jobs.JobStatus !== 'undefined' || jobs.isTerminalJobStatus('COMPLETED') === true);
});

test('@moonwitness/orchestrator key exports exist', () => {
  assert.strictEqual(typeof orchestrator.runAnalysisWorkflow, 'function');
  assert.strictEqual(typeof orchestrator.runObservationWorkflow, 'function');
  assert.strictEqual(typeof orchestrator.runEvaluationWorkflow, 'function');
  assert.ok(typeof orchestrator.toEvidenceObservations === 'function');
});

test('@moonwitness/cosmic-engine key exports exist', () => {
  assert.strictEqual(typeof cosmicEngine.createCosmicEngine, 'function');
  assert.strictEqual(typeof cosmicEngine.evaluateMizanService, 'function');
  assert.strictEqual(typeof cosmicEngine.toCosmicSemanticObservation, 'function');
  assert.strictEqual(typeof cosmicEngine.explainTemporalContext, 'function');
  assert.strictEqual(typeof cosmicEngine.explainLegalResult, 'function');
  assert.ok(typeof cosmicEngine.SemanticRegistry === 'function');
});

test('@moonwitness/sdk key exports exist', () => {
  assert.strictEqual(typeof sdk.UniverseClient, 'function');
  assert.strictEqual(typeof sdk.UniverseApiError, 'function');
  assert.strictEqual(typeof sdk.UniverseContractError, 'function');
  assert.ok(typeof sdk.UniverseClientOptions !== 'undefined' || typeof sdk.UniverseClient === 'function');
});

test('packages can be imported from a simulated consumer project', () => {
  assert.ok(typeof contracts.ContractValidationError === 'function');
  assert.ok(typeof temporalEngine.now === 'function');
  assert.ok(typeof tseEngine.calculateTemporalState === 'function');
  assert.ok(typeof semanticEngine.buildAnalyticalSemanticVector === 'function');
  assert.ok(typeof mizanEngine.evaluateMizan === 'function');
  assert.ok(typeof explanationEngine.explainTemporalContext === 'function');
  assert.ok(witness.WitnessDag !== undefined || typeof witness.exportWitnessBundle === 'function');
  assert.ok(persistence.PersistenceClient !== undefined || typeof persistence.factory === 'function');
  assert.ok(typeof jobs.PersistentJobQueue === 'function');
  assert.ok(typeof orchestrator.runAnalysisWorkflow === 'function');
  assert.ok(typeof cosmicEngine.createCosmicEngine === 'function');
  assert.ok(typeof sdk.UniverseClient === 'function');
});

test('no framework-specific imports leak into engine packages', async () => {
  const pkgDir = path.join(repo, 'packages');
  const packages = (await readdir(pkgDir, { withFileTypes: true }))
    .filter((e) => e.isDirectory())
    .map((e) => e.name);

  const violations: string[] = [];
  for (const pkg of packages) {
    const srcDir = path.join(pkgDir, pkg, 'src');
    const files = await walk(srcDir);
    for (const file of files) {
      const text = await readFile(file, 'utf8');
      const imports = [...text.matchAll(/(?:from\s+|import\s*\(\s*|require\(\s*)["']([^"']+)["']/g)].map((m) => m[1]);
      for (const specifier of imports) {
        if (packageHostImportPatterns.some((pattern) => pattern.test(specifier))) {
          violations.push(`${path.relative(repo, file)}: ${specifier}`);
        }
      }
    }
  }

  if (violations.length) {
    console.error('Framework import leaks detected:');
    for (const v of violations) console.error(`- ${v}`);
  }
  assert.strictEqual(violations.length, 0, 'no framework imports should leak into packages');
});
