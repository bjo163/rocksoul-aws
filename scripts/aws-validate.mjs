import { loadAwsCorpus, validateAwsCorpus } from "./lib/aws-corpus-validator.mjs";

const corpus = await loadAwsCorpus();
const errors = validateAwsCorpus(corpus);

if (errors.length > 0) {
  console.error("AWS legal corpus validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  const count = Object.values(corpus).reduce((sum, items) => sum + items.length, 0);
  console.log(`AWS legal corpus validation: OK (${count} canonical records)`);
}
