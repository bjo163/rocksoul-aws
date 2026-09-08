import crypto from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const COLLECTIONS = [
  "bindings",
  "sources",
  "foreign_refs",
  "instruments",
  "treaty_actions",
  "jurisdictions",
  "authorities",
  "holdings",
  "legal_cases",
  "applicability",
  "claims",
  "claim_assessments",
  "case_syntheses",
  "assessments",
  "case_graphs",
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

function hash24(value) {
  return crypto.createHash("sha256").update(value).digest("hex").slice(0, 24).toUpperCase();
}

function expectedForeignRefId(domain, canonicalRef) {
  return `XREF-${domain}-${hash24(`${domain}|${canonicalRef}`)}`;
}

function expectedGraphEdgeId(caseRef, relation, targetRef) {
  return `GEDGE-${hash24(`${caseRef}|${relation}|${targetRef}`)}`;
}

function expectedClaimAssessmentResult(applicability, supportRefs, contradictionRefs) {
  if (applicability === "NOT_APPLICABLE") return "NOT_REACHED";
  if (applicability === "UNCERTAIN" || applicability === "PARTIALLY_APPLICABLE") return "UNRESOLVED";
  const hasSupport = (supportRefs ?? []).length > 0;
  const hasContradiction = (contradictionRefs ?? []).length > 0;
  if (hasSupport && hasContradiction) return "MIXED";
  if (hasSupport) return "SUPPORTED";
  if (hasContradiction) return "CONTRADICTED";
  return "UNRESOLVED";
}

function expectedCaseSynthesis(results) {
  if (!results || results.length === 0) return "UNRESOLVED";
  const material = results.filter((result) => result !== "NOT_REACHED");
  if (material.length === 0) return "UNRESOLVED";
  if (material.some((result) => ["UNRESOLVED", "MIXED"].includes(result))) return "UNRESOLVED";
  const hasSupported = material.includes("SUPPORTED");
  const hasContradicted = material.includes("CONTRADICTED");
  if (hasSupported && hasContradicted) return "MIXED_HOLDINGS";
  if (hasSupported) return "CONSISTENT_SUPPORT";
  if (hasContradicted) return "CONSISTENT_CONTRADICTION";
  return "UNRESOLVED";
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

  const bindingByDomain = new Map();
  for (const { record, file } of corpus.bindings) {
    add(errors, /^BIND-AWS-/.test(record.id), `${file}: invalid binding id`);
    add(errors, Array.isArray(record.bindings) && record.bindings.length >= 4, `${file}: binding registry incomplete`);
    for (const binding of record.bindings ?? []) {
      add(errors, !bindingByDomain.has(binding.domain), `${file}: duplicate binding domain ${binding.domain}`);
      bindingByDomain.set(binding.domain, binding);
      add(errors, binding.ownership === "FOREIGN", `${file}: binding ownership must remain FOREIGN`);
    }
  }

  for (const { record, file } of corpus.foreign_refs) {
    add(errors, /^XREF-(STORY|EVENT|PERSON|RGBL)-/.test(record.id), `${file}: invalid foreign ref id`);
    const binding = bindingByDomain.get(record.domain);
    add(errors, Boolean(binding), `${file}: missing repository binding for ${record.domain}`);
    if (binding) {
      add(errors, record.repository === binding.repository, `${file}: foreign repository mismatch for ${record.domain}`);
      add(errors, record.canonical_ref?.startsWith(binding.ref_prefix), `${file}: foreign ref prefix mismatch for ${record.domain}`);
    }
    add(
      errors,
      record.id === expectedForeignRefId(record.domain, record.canonical_ref),
      `${file}: non-deterministic foreign ref id ${record.id}`
    );
    add(errors, record.ownership === "FOREIGN", `${file}: foreign ref must not claim AWS ownership`);
    add(
      errors,
      ["VERIFIED", "UNVERIFIED", "MISSING", "STALE"].includes(record.verification?.state),
      `${file}: invalid foreign verification state`
    );
    if (record.verification?.state === "VERIFIED") {
      add(errors, /^[a-f0-9]{40}$/.test(record.verification?.commit_sha ?? ""), `${file}: verified foreign ref requires commit_sha`);
      add(errors, typeof record.verification?.evidence_path === "string", `${file}: verified foreign ref requires evidence_path`);
    }
    if (record.verification?.state === "MISSING") {
      add(errors, record.verification?.match_kind === "NOT_FOUND", `${file}: MISSING foreign ref must use NOT_FOUND evidence kind`);
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

  for (const { record, file } of corpus.holdings) {
    add(errors, /^HOLD-/.test(record.id), `${file}: invalid holding id`);
    add(errors, indexed.has(record.authority_ref), `${file}: unresolved authority_ref ${record.authority_ref}`);
    add(errors, indexed.has(record.case_ref), `${file}: unresolved case_ref ${record.case_ref}`);
    validateResolvedRefs(errors, indexed, record.basis_refs, file, "basis_ref");
  }

  for (const { record, file } of corpus.legal_cases) {
    add(errors, /^LCASE-/.test(record.id), `${file}: invalid legal case id`);
    validateResolvedRefs(errors, indexed, record.legal_basis_refs, file, "legal_basis_ref");
    validateResolvedRefs(errors, indexed, record.treaty_action_refs, file, "treaty_action_ref");
    validateResolvedRefs(errors, indexed, record.jurisdiction_refs, file, "jurisdiction_ref");
    validateResolvedRefs(errors, indexed, record.authority_refs, file, "authority_ref");
    validateResolvedRefs(errors, indexed, record.holding_refs, file, "holding_ref");
    validateResolvedRefs(errors, indexed, record.applicability_refs, file, "applicability_ref");
    validateResolvedRefs(errors, indexed, record.claim_refs, file, "claim_ref");
    validateResolvedRefs(errors, indexed, record.claim_assessment_refs, file, "claim_assessment_ref");
    validateResolvedRefs(errors, indexed, record.case_synthesis_refs, file, "case_synthesis_ref");
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

  const claimAssessmentById = new Map();
  for (const { record, file } of corpus.claim_assessments) {
    claimAssessmentById.set(record.id, record);
    add(errors, /^CASSMT-/.test(record.id), `${file}: invalid claim assessment id`);
    add(errors, indexed.has(record.case_ref), `${file}: unresolved case_ref ${record.case_ref}`);
    add(errors, indexed.has(record.claim_ref), `${file}: unresolved claim_ref ${record.claim_ref}`);
    add(errors, indexed.has(record.applicability_ref), `${file}: unresolved applicability_ref ${record.applicability_ref}`);
    validateResolvedRefs(errors, indexed, record.supporting_holding_refs, file, "supporting_holding_ref");
    validateResolvedRefs(errors, indexed, record.contradicting_holding_refs, file, "contradicting_holding_ref");

    const applicability = applicabilityById.get(record.applicability_ref)?.overall;
    const expected = expectedClaimAssessmentResult(
      applicability,
      record.supporting_holding_refs,
      record.contradicting_holding_refs
    );
    add(
      errors,
      record.result === expected,
      `${file}: claim assessment result ${record.result} does not match deterministic result ${expected}`
    );
  }

  for (const { record, file } of corpus.case_syntheses) {
    add(errors, /^CSYN-/.test(record.id), `${file}: invalid case synthesis id`);
    add(errors, indexed.has(record.case_ref), `${file}: unresolved case_ref ${record.case_ref}`);
    validateResolvedRefs(errors, indexed, record.claim_assessment_refs, file, "claim_assessment_ref");

    const results = (record.claim_assessment_refs ?? [])
      .map((ref) => claimAssessmentById.get(ref)?.result)
      .filter(Boolean);
    const expected = expectedCaseSynthesis(results);
    add(
      errors,
      record.result === expected,
      `${file}: case synthesis result ${record.result} does not match deterministic result ${expected}`
    );

    if (record.result === "MIXED_HOLDINGS") {
      add(errors, record.legal_result === "UNRESOLVED", `${file}: mixed holdings must not auto-create a decisive legal result`);
      add(errors, record.mizan_status === "NOT_RUN", `${file}: mixed holdings must not auto-run Mizan`);
    }
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

  for (const { record, file } of corpus.case_graphs) {
    add(errors, /^CGRAPH-/.test(record.id), `${file}: invalid case graph id`);
    add(errors, indexed.has(record.case_ref), `${file}: unresolved graph case_ref ${record.case_ref}`);
    validateResolvedRefs(errors, indexed, record.node_refs, file, "graph node_ref");

    const seenEdges = new Set();
    for (const edge of record.edges ?? []) {
      add(errors, edge.from_ref === record.case_ref, `${file}: graph edge ${edge.id} must originate at case_ref`);
      add(errors, indexed.has(edge.from_ref), `${file}: unresolved graph from_ref ${edge.from_ref}`);
      add(errors, indexed.has(edge.to_ref), `${file}: unresolved graph to_ref ${edge.to_ref}`);
      add(errors, !seenEdges.has(edge.id), `${file}: duplicate graph edge ${edge.id}`);
      seenEdges.add(edge.id);
      add(
        errors,
        edge.id === expectedGraphEdgeId(record.case_ref, edge.relation, edge.to_ref),
        `${file}: non-deterministic graph edge id ${edge.id}`
      );
      add(errors, record.node_refs?.includes(edge.from_ref), `${file}: graph from_ref absent from node_refs ${edge.from_ref}`);
      add(errors, record.node_refs?.includes(edge.to_ref), `${file}: graph to_ref absent from node_refs ${edge.to_ref}`);
    }
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

    validateResolvedRefs(errors, indexed, record.graph_refs, file, "graph_ref");

    for (const graphRef of record.graph_refs ?? []) {
      const graph = indexed.get(graphRef)?.record;
      if (!graph) continue;

      const externalExpectations = [
        ["story", "STORY", "CASE_HAS_STORY"],
        ["event", "EVENT", "CASE_HAS_EVENT"],
        ["person", "PERSON", "CASE_HAS_PERSON"],
        ["rgbl", "RGBL", "CASE_HAS_RGBL"]
      ];

      for (const [key, domain, relation] of externalExpectations) {
        const expectedRefs = new Set(record.external_refs?.[key] ?? []);
        const actualRefs = new Set(
          (graph.edges ?? [])
            .filter((edge) => edge.relation === relation)
            .map((edge) => indexed.get(edge.to_ref)?.record)
            .filter((foreign) => foreign?.domain === domain)
            .map((foreign) => foreign.canonical_ref)
        );
        add(
          errors,
          expectedRefs.size === actualRefs.size && [...expectedRefs].every((ref) => actualRefs.has(ref)),
          `${file}: graph ${graphRef} does not exactly mirror external_refs.${key}`
        );
      }

      const localExpectations = [
        ["legal_basis", "CASE_HAS_LEGAL_BASIS"],
        ["applicability", "CASE_HAS_APPLICABILITY"],
        ["claims", "CASE_HAS_CLAIM"],
        ["assessments", "CASE_HAS_ASSESSMENT"]
      ];
      for (const [key, relation] of localExpectations) {
        const expectedRefs = new Set(record.aws_refs?.[key] ?? []);
        const actualRefs = new Set(
          (graph.edges ?? []).filter((edge) => edge.relation === relation).map((edge) => edge.to_ref)
        );
        add(
          errors,
          expectedRefs.size === actualRefs.size && [...expectedRefs].every((ref) => actualRefs.has(ref)),
          `${file}: graph ${graphRef} does not exactly mirror aws_refs.${key}`
        );
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
