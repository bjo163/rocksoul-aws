// @ts-nocheck
export function createPublicProject(input={}) {
  return {
    projectId: input.projectId,
    title: input.title,
    ownerOffice: input.ownerOffice,
    objective: input.objective ?? '',
    budget: input.budget ?? 0,
    fundingSources: input.fundingSources ?? [],
    milestones: input.milestones ?? [],
    procurement: input.procurement ?? [],
    progress: input.progress ?? 0,
    issues: input.issues ?? [],
    audit: input.audit ?? {status:'PENDING'},
    visibility: input.visibility ?? 'PUBLIC_BY_DEFAULT',
    status: input.status ?? 'PLANNED'
  };
}

export function createDecision(input={}) {
  return {
    decisionId: input.decisionId,
    proposer: input.proposer,
    legalBasis: input.legalBasis ?? [],
    evidence: input.evidence ?? [],
    options: input.options ?? [],
    publicComment: input.publicComment ?? [],
    cost: input.cost ?? 0,
    benefit: input.benefit ?? 0,
    risks: input.risks ?? [],
    dissent: input.dissent ?? [],
    decision: input.decision ?? null,
    published: input.published ?? false
  };
}
