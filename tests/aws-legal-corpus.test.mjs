import test from "node:test";
import assert from "node:assert/strict";
import { loadAwsCorpus, validateAwsCorpus } from "../scripts/lib/aws-corpus-validator.mjs";

function clone(value) {
  return structuredClone(value);
}

test("canonical AWS Phase-1 corpus passes invariants", async () => {
  const corpus = await loadAwsCorpus();
  assert.deepEqual(validateAwsCorpus(corpus), []);
});

test("NOT_APPLICABLE cannot silently become PERMITTED", async () => {
  const corpus = clone(await loadAwsCorpus());
  const target = corpus.assessments.find(({ record }) => record.id === "LASSMT-JERUSALEM-70-GCIV");
  target.record.legal_result = "PERMITTED";
  target.record.review.status = "APPROVED";

  const errors = validateAwsCorpus(corpus);
  assert.ok(errors.some((message) => message.includes("NOT_APPLICABLE legal bases cannot alone yield PERMITTED")));
});

test("modern treaty cannot be forced to APPLY to 70 CE", async () => {
  const corpus = clone(await loadAwsCorpus());
  const target = corpus.applicability.find(({ record }) => record.id === "APPL-JERUSALEM-70-GCIV");
  target.record.dimensions.temporal.status = "APPLIES";
  target.record.overall = "APPLICABLE";

  const errors = validateAwsCorpus(corpus);
  assert.ok(errors.some((message) => message.includes("anachronism detected")));
});

test("five-domain case preserves explicit ownership prefixes", async () => {
  const corpus = await loadAwsCorpus();
  const record = corpus.cases.find(({ record }) => record.id === "CASE-AWS-JERUSALEM-70").record;

  assert.equal(record.external_refs.story[0], "mftl:MYTH-JERUSALEM-TEMPLE-DESTRUCTION-PROPHECY-000001");
  assert.equal(record.external_refs.event[0], "legend:EVT-JERUSALEM-SECOND-TEMPLE-DESTRUCTION-70");
  assert.equal(record.external_refs.person[0], "superhero:PER-JERUSALEM-FLAVIUS-JOSEPHUS");
  assert.ok(record.external_refs.rgbl.every((ref) => ref.startsWith("rgbl:")));
});
