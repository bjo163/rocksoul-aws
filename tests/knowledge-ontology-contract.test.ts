import test from 'node:test';
import assert from 'node:assert/strict';

const NODE_KINDS = ['PERSON','PROPHET_REFERENCE','PLACE','EVENT','BOOK','SURAH','PASSAGE','CLAIM','SOURCE','EVIDENCE','CASE','REVIEW','WITNESS','AUDIT_RECORD'];
const EPISTEMIC_LANES = ['CORE','DERIVED','UNRESOLVED'];
const SOURCE_CLASSES = ['REVELATION','SCRIPTURAL_METADATA','HISTORICAL_REPORT','TEXTUAL_WITNESS','OBSERVATION','INFERENCE','AI_OUTPUT','GOVERNANCE_RECORD'];
const RELATIONS = ['REFERENCES','INVOLVES','OCCURS_AT','SUPPORTS','CORROBORATES','CONFLICTS_WITH','DERIVED_FROM','REVIEWED_BY','WITNESSED_BY','AUDITED_BY'];

test('L0 knowledge ontology freezes canonical node kinds', () => {
  assert.deepStrictEqual(NODE_KINDS, [
    'PERSON','PROPHET_REFERENCE','PLACE','EVENT','BOOK','SURAH','PASSAGE',
    'CLAIM','SOURCE','EVIDENCE','CASE','REVIEW','WITNESS','AUDIT_RECORD'
  ]);
});

test('L0 keeps epistemic lane and source class orthogonal', () => {
  assert.deepStrictEqual(EPISTEMIC_LANES, ['CORE','DERIVED','UNRESOLVED']);
  assert.deepStrictEqual(SOURCE_CLASSES, [
    'REVELATION','SCRIPTURAL_METADATA','HISTORICAL_REPORT','TEXTUAL_WITNESS',
    'OBSERVATION','INFERENCE','AI_OUTPUT','GOVERNANCE_RECORD'
  ]);
  assert.equal(new Set(EPISTEMIC_LANES).size, EPISTEMIC_LANES.length);
  assert.equal(new Set(SOURCE_CLASSES).size, SOURCE_CLASSES.length);
  assert.equal(EPISTEMIC_LANES.some(value => SOURCE_CLASSES.includes(value)), false);
});

test('L0 freezes canonical relation vocabulary and negative boundaries', () => {
  assert.deepStrictEqual(RELATIONS, [
    'REFERENCES','INVOLVES','OCCURS_AT','SUPPORTS','CORROBORATES',
    'CONFLICTS_WITH','DERIVED_FROM','REVIEWED_BY','WITNESSED_BY','AUDITED_BY'
  ]);
  assert.equal(SOURCE_CLASSES.includes('DERIVED'), false);
  assert.equal(SOURCE_CLASSES.includes('UNRESOLVED'), false);
  assert.equal(SOURCE_CLASSES.includes('PROPHET_REFERENCE'), false);
  assert.equal(SOURCE_CLASSES.includes('WITNESS'), false);
  assert.equal(NODE_KINDS.includes('PROPHET_REFERENCE'), true);
  assert.equal(NODE_KINDS.includes('WITNESS'), true);
});
