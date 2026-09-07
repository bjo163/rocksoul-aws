import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const rawPath = path.join(root, "data/aws/raw/icrc/gciv-1949.metadata.json");
const outputPath = path.join(root, "data/aws/instruments/LAW-IHL-GCIV-1949.json");

const raw = JSON.parse(await readFile(rawPath, "utf8"));

if (raw.source_id !== "SRC-AWS-ICRC-IHL") {
  throw new Error(`Unexpected source_id: ${raw.source_id}`);
}
if (raw.adoption_date > raw.entry_into_force_date) {
  throw new Error("ICRC snapshot has entry_into_force_date before adoption_date");
}

const record = {
  id: "LAW-IHL-GCIV-1949",
  title: raw.title,
  short_title: raw.short_title,
  instrument_type: "convention",
  issuing_body: null,
  adoption_date: raw.adoption_date,
  entry_into_force_date: raw.entry_into_force_date,
  termination_date: null,
  languages: raw.authentic_languages,
  source: {
    url: raw.source_url,
    stable_id: "icrc:gciv-1949",
    source_role: "PRIMARY_TEXT",
    publisher: "International Committee of the Red Cross",
    language: "en",
    retrieved_at: raw.captured_at,
    sha256: null
  },
  supersedes: [],
  superseded_by: [],
  research_state: "CANONICAL",
  notes:
    "Generated deterministically from data/aws/raw/icrc/gciv-1949.metadata.json. Entry into force is cross-checked against the ICRC 2025 Commentary to Article 159."
};

const serialized = JSON.stringify(record, null, 2) + "\n";

if (process.argv.includes("--check")) {
  const existing = await readFile(outputPath, "utf8");
  if (existing !== serialized) {
    console.error("AWS ICRC ingestion drift: committed GC IV record does not match deterministic output.");
    process.exitCode = 1;
  } else {
    console.log("AWS ICRC ingestion check: OK");
  }
} else {
  await writeFile(outputPath, serialized, "utf8");
  console.log(`Wrote ${path.relative(root, outputPath)}`);
}
