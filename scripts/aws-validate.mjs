import { readFile } from "node:fs/promises";
import { loadAwsCorpus, validateAwsCorpus } from "./lib/aws-corpus-validator.mjs";

const corpus = await loadAwsCorpus();
const errors = validateAwsCorpus(corpus);
const classification = JSON.parse(await readFile(new URL("../data/ownership-classification.json", import.meta.url), "utf8"));

const allowed = new Set(classification.allowed_classifications ?? []);
const entries = classification.classifications ?? [];
const byPath = new Map(entries.map((entry) => [entry.path, entry]));
const requiredBoundaries = [
  ["data/aws/**", "CANONICAL_AWS"],
  ["data/divine-books/**", "LEGACY_ENGINE_INPUT"],
  ["data/revelation/**", "LEGACY_ENGINE_INPUT"],
  ["data/identity/**", "LEGACY_ENGINE_INPUT"],
  ["data/events/**", "LEGACY_ENGINE_INPUT"],
  ["data/normative/**", "COMPATIBILITY"],
  ["data/mizan/**", "DERIVED"],
  ["data/knowledge/**", "LEGACY_ENGINE_INPUT"],
  ["src/normative/**", "COMPATIBILITY"],
  ["src/revelation/**", "COMPATIBILITY"],
  ["packages/revelation/**", "COMPATIBILITY"],
];

if (classification.canonical_domain !== "LAW") errors.push("ownership classification canonical_domain must be LAW");
if (classification.canonical_publication_root !== "data/aws/**") errors.push("only data/aws/** may be the canonical AWS publication root");
for (const entry of entries) {
  if (!allowed.has(entry.classification)) errors.push(`${entry.path}: unsupported ownership classification ${entry.classification}`);
  if (entry.path !== "data/aws/**" && entry.classification === "CANONICAL_AWS") errors.push(`${entry.path}: foreign/legacy surface cannot be CANONICAL_AWS`);
}
for (const [path, expected] of requiredBoundaries) {
  if (byPath.get(path)?.classification !== expected) errors.push(`${path}: expected ${expected} ownership classification`);
}
if (byPath.get("data/divine-books/**")?.foreign_domain !== "TEXT" || byPath.get("data/divine-books/**")?.foreign_owner !== "rocksoul-rgbl") {
  errors.push("divine-books boundary must preserve RGBL/TEXT ownership");
}
if (byPath.get("data/events/**")?.foreign_domain !== "EVENT" || byPath.get("data/events/**")?.foreign_owner !== "rocksoul-legend") {
  errors.push("events boundary must preserve LEGEND/EVENT ownership");
}
if (byPath.get("data/identity/**")?.foreign_domain !== "PERSON" || byPath.get("data/identity/**")?.foreign_owner !== "rocksoul-superhero") {
  errors.push("identity boundary must preserve SUPERHERO/PERSON ownership");
}

if (errors.length > 0) {
  console.error("AWS legal corpus validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  const count = Object.values(corpus).reduce((sum, items) => sum + items.length, 0);
  console.log(`AWS legal corpus validation: OK (${count} canonical records)`);
  console.log("AWS ownership boundary: OK (LAW canonical; inherited foreign-domain engine material classified noncanonical/compatibility).")
}
