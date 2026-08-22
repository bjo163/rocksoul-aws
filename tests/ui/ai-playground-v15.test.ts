import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync('apps/cab/src/components/AiPlayground.tsx','utf8');
const css = fs.readFileSync('apps/cab/src/styles.css','utf8');

test('AI playground renders the semantic observatory pipeline', () => {
  for (const token of ['Semantic Observatory','Analyze Case','DOMAIN','MĪZĀN','CASE LIFECYCLE','OBSERVED','INFERRED','SUPPORTED','UNKNOWN','Evidence']) {
    assert.ok(app.includes(token), token);
  }
});

test('AI playground exposes RGBL chain and vectors', () => {
  for (const token of ['R → G → B → L','9 ACTION GATE VECTOR','13 IMPACT VECTOR','ALTERNATIVE HYPOTHESES','CONFLICTS']) {
    assert.ok(app.includes(token), token);
  }
});

test('AI playground has visualization styles', () => {
  for (const token of ['mw-rgbl-chain','mw-vector-track','mw-lifecycle-track','mw-trace','mw-playground-kpis']) {
    assert.ok(css.includes(token), token);
  }
});
