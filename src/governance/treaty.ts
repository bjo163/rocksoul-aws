// @ts-nocheck
export function createTreaty(input={}) {
  return {
    treatyId: input.treatyId,
    parties: input.parties ?? [],
    scope: input.scope ?? [],
    rights: input.rights ?? [],
    duties: input.duties ?? [],
    security: input.security ?? [],
    trade: input.trade ?? [],
    disputeResolution: input.disputeResolution ?? [],
    breachRemedies: input.breachRemedies ?? [],
    startAt: input.startAt ?? null,
    endAt: input.endAt ?? null,
    status: input.status ?? 'DRAFT'
  };
}
