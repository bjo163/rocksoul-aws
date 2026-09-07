import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const COLLECTIONS = [
  "sources",
  "instruments",
  "treaty_actions",
  "jurisdictions",
  "authorities",
  "legal_cases",
  "applicability",
  "claims",
  "assessments",
  "cases"
];

async function readJson(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

export async function loadAwsCorpus(root = process.cwd()) {
  const awsRoot = path.join(root, "data/aws");
  const corpus = {};
  for (const collection of COLLECTIONS) {
    const dir = path.join(awsRoot, collection);
    const names = (await readdir(dir)).filter((name) => name.endsWith(".json")).sort();
    corpus[collection] = [];
    for (const name of names) {
      const file = path.join(dir, name);
      corpus[collection].push({ file, record: await readJson(file) });
    }
  }
  return corpus;
}

function add(errors, condition, message) {
  if (!condition) errors.push(message);
}

function isUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function allRecords(corpus) {
  return COLLECTIONS.flatMap((collection) =>
    corpus[collection].map(({ record, file }) => ({ collection, record, file }))
  );
}

function expectedApplicabilityOverall(dimensions) {
  const required = ["temporal", "territorial", "personal", "subject_matter", "jurisdiction"];
  const statuses = required.map((key) => dimensions?.[key]?.status);
  if (statuses.includes("DOES_NOT_APPLY")) return "NOT_APPLICABLE";
  if (statuses.includes("UNCERTAIN") || statuses.some((status) => !status)) return "UNCERTAIN";
  if (statuses.includes("PARTIAL")) return "PARTIALLY_APPLICABLE";
  return "APPLICABLE";
}

function validateResolvedRefs(errors, indexed, refs, file, label) {
  for (const ref of refs ?? []) {
    add(errors, indexed.has(ref), `${file}: unresolved ${label} ${ref}`);
  }
}

export function validateAwsCorpus(corpus) {
  const errors = [];
  const indexed = new Map();

  for (const { collection, record, file } of allRecords(corpus)) {
    add(errors, typeof record.id === "string" && record.id.length > 0, `${file}: missing id`);
    if (typeof record.id === "string") {
      add(errors, !indexed.has(record.id), `${file}: duplicate id ${record.id}`);
      indexed.set(record.id, { collection, record, file });
    }
  }

  for (const { record, file } of corpus.sources) {
    add(errors, /^SRC-AWS-/.test(record.id), `${file}: invalid source id`);
    add(errors, isUrl(record.canonical_url), `${file}: canonical_url must be http(s)`);
    add(errors, typeof record.authority_role === "string", `${file}: missing authority_role`);
  }

  for (const { record, file } of corpus.instruments) {
    add(errors, /^LAW-/.test(record.id), `${file}: invalid legal instrument id`);
    add(errors, typeof record.title === "string" && record.title.length > 0, `${file}: missing title`);
    add(errors, record.source && isUrl(record.source.url), `${file}: source.url must be http(s)`);
    if (record.adoption_date && record.entry_into_force_date) {
      add(
        errors,
        record.adoption_date <= record.entry_into_force_date,
        `${file}: entry_into_force_date precedes adoption_date`
      );
    }
  }

  for (const { record, file } of corpus.treaty_actions) {
    add(errors, /^TACT-/.test(record.id), `${file}: invalid treaty action id`);
    add(errors, indexed.has(record.instrument_ref), `${file}: unresolved instrument_ref ${record.instrument_ref}`);
    add(errors, typeof record.actor_ref === "string" && record.actor_ref.length > 0, `${file}: missing actor_ref`);
    add(errors, record.action_date === null || /^\d{4}-\d{2}-\d{2}$/.test(record.action_date), `${file}: invalid action_date`);
    add(errors, record.source && isUrl(record.source.url), `${file}: treaty action source.url must be http(s)`);
    validateResolvedRefs(errors, indexed, record.related_action_refs, file, "related_action_ref");
  }

  for (const { record, file } of corpus.jurisdictions) {
    add(errors, /^JUR-/.test(record.id), `${file}: invalid jurisdiction id`);
    add(errors, Array.isArray(record.sources) && record.sources.every(isUrl), `${file}: invalid jurisdiction source`);
  }

  for (const { record, file } of corpus.authorities) {
    add(errors, /^AUTH-/.test(record.id), `${file}: invalid authority id`);
    add(errors, typeof record.title === "string" && record.title.length > 0, `${file}: authority missing title`);
    add(errors, record.source && isUrl(record.source.url), `${file}: authority source.url must be http(s)`);
    add(errors, indexed.has(record.source?.source_ref), `${file}: unresolved authority source_ref ${record.source?.source_ref}`);
    if (record.case_ref !== null) {
      add(errors, indexed.has(record.case_ref), `${file}: unresolved authority case_ref ${record.case_ref}`);
    }
    validateResolvedRefs(errors, indexed, record.jurisdiction_basis_refs, file, "jurisdiction_basis_ref");
  }

  for (const { record, file } of corpus.legal_cases) {
    add(errors, /^LCASE-/.test(record.id), `${file}: invalid legal case id`);
    validateResolvedRefs(errors, indexed, record.legal_basis_refs, file, "legal_basis_ref");
    validateResolvedRefs(errors, indexed, record.treaty_action_refs, file, "treaty_action_ref");
    validateResolvedRefs(errors, indexed, record.jurisdiction_refs, file, "jurisdiction_ref");
    validateResolvedRefs(errors, indexed, record.authority_refs, file, "authority_ref");
    validateResolvedRefs(errors, indexed, record.applicability_refs, file, "applicability_ref");
    validateResolvedRefs(errors, indexed, record.claim_refs, file, "claim_ref");
    validateResolvedRefs(errors, indexed, record.assessment_refs, file, "assessment_ref");
  }

  const applicabilityById = new Map();
  for (const { record, file } of corpus.applicability) {
    applicabilityById.set(record.id, record);
    add(errors, /^APPL-/.test(record.id), `${file}: invalid applicability id`);
    add(errors, indexed.has(record.legal_basis_ref), `${file}: unresolved legal_basis_ref ${record.legal_basis_ref}`);
    add(errors, indexed.has(record.case_ref), `${file}: unresolved case_ref ${record.case_ref}`);
    if (record.jurisdiction_ref !== null) {
      add(errors, indexed.has(record.jurisdiction_ref), `${file}: unresolved jurisdiction_ref ${record.jurisdiction_ref}`);
    }

    const requiredDimensions = ["temporal", "territorial", "personal", "subject_matter", "jurisdiction"];
    for (const key of requiredDimensions) {
      const dimension = record.dimensions?.[key];
      add(errors, dimension && typeof dimension.status === "string", `${file}: missing applicability dimension ${key}`);
      validateResolvedRefs(errors, indexed, dimension?.basis_refs, file, `${key}.basis_ref`);
    }

    validateResolvedRefs(errors, indexed, record.basis_refs, file, "basis_ref");
    validateResolvedRefs(errors, indexed, record.contrary_refs, file, "contrary_ref");

    const expected = expectedApplicabilityOverall(record.dimensions);
    add(
      errors,
      record.overall === expected,
      `${file}: overall ${record.overall} does not match five-dimension result ${expected}`
    );
  }

  for (const { record, file } of corpus.claims) {
    add(errors, /^LCLAIM-/.test(record.id), `${file}: invalid legal claim id`);
    add(errors, indexed.has(record.case_ref), `${file}: unresolved case_ref ${record.case_ref}`);
    validateResolvedRefs(errors, indexed, record.basis_refs, file, "basis_ref");
    validateResolvedRefs(errors, indexed, record.evidence_refs, file, "evidence_ref");
    validateResolvedRefs(errors, indexed, record.contrary_authority_refs, file, "contrary_authority_ref");
    validateResolvedRefs(errors, indexed, record.counterclaim_refs, file, "counterclaim_ref");
  }

  for (const { record, file } of corpus.assessments) {
    add(errors, /^LASSMT-/.test(record.id), `${file}: invalid assessment id`);
    add(errors, indexed.has(record.case_ref), `${file}: unresolved case_ref ${record.case_ref}`);
    const applicableRecords = [];
    for (const ref of record.applicability_refs ?? []) {
      add(errors, indexed.has(ref), `${file}: unresolved applicability_ref ${ref}`);
      if (applicabilityById.has(ref)) applicableRecords.push(applicabilityById.get(ref));
    }
    validateResolvedRefs(errors, indexed, record.claim_refs, file, "claim_ref");
    validateResolvedRefs(errors, indexed, record.contrary_authority_refs, file, "contrary_authority_ref");

    for (const item of record.reasoning ?? []) {
      validateResolvedRefs(errors, indexed, item.basis_refs, file, "reasoning.basis_ref");
    }

    const allNotApplicable =
      applicableRecords.length > 0 &&
      applicableRecords.every((item) => item.overall === "NOT_APPLICABLE");

    if (allNotApplicable) {
      add(
        errors,
        ["UNRESOLVED", "DISPUTED"].includes(record.legal_result),
        `${file}: NOT_APPLICABLE legal bases cannot alone yield ${record.legal_result}`
      );
    }

    if (["PERMITTED", "RESTRICTED", "PROHIBITED"].includes(record.legal_result)) {
      add(
        errors,
        record.review?.status === "APPROVED",
        `${file}: decisive legal result requires APPROVED review`
      );
    }

    add(
      errors,
      record.mizan?.status !== undefined,
      `${file}: assessment must explicitly state Mizan status`
    );
  }

  for (const { record, file } of corpus.cases) {
    add(errors, /^CASE-AWS-/.test(record.id), `${file}: invalid case id`);
    const prefixRules = [
      ["story", "mftl:"],
      ["event", "legend:"],
      ["person", "superhero:"],
      ["rgbl", "rgbl:"]
    ];
    for (const [key, prefix] of prefixRules) {
      const refs = record.external_refs?.[key] ?? [];
      add(errors, refs.length > 0, `${file}: missing ${key} reference`);
      for (const ref of refs) {
        add(errors, ref.startsWith(prefix), `${file}: ${key} ref must start with ${prefix}: ${ref}`);
      }
    }

    for (const ref of record.aws_refs?.legal_basis ?? []) {
      add(errors, indexed.has(ref), `${file}: unresolved legal_basis ref ${ref}`);
      const instrument = indexed.get(ref)?.record;
      if (instrument?.adoption_date) {
        const adoptionYear = Number(instrument.adoption_date.slice(0, 4));
        if (record.event_year_ce < adoptionYear) {
          for (const applRef of record.aws_refs?.applicability ?? []) {
            const appl = applicabilityById.get(applRef);
            if (appl?.legal_basis_ref === ref) {
              add(
                errors,
                appl.dimensions?.temporal?.status !== "APPLIES" && appl.overall !== "APPLICABLE",
                `${file}: anachronism detected: ${ref} adopted in ${adoptionYear} cannot APPLY to event year ${record.event_year_ce}`
              );
            }
          }
        }
      }
    }

    validateResolvedRefs(
      errors,
      indexed,
      [
        ...(record.aws_refs?.applicability ?? []),
        ...(record.aws_refs?.claims ?? []),
        ...(record.aws_refs?.assessments ?? [])
      ],
      file,
      "AWS ref"
    );

    if (record.result?.applicability === "NOT_APPLICABLE") {
      add(
        errors,
        ["UNRESOLVED", "DISPUTED"].includes(record.result?.legal_result),
        `${file}: NOT_APPLICABLE case cannot be collapsed to ${record.result?.legal_result}`
      );
    }
  }

  return errors;
}
