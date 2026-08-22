// @ts-nocheck
export function defineOffice(input={}) {
  const officeId = input.officeId ?? `OFFICE-${crypto.randomUUID()}`;
  return {
    officeId,
    functionId: input.functionId ?? officeId,
    titleKey: input.titleKey ?? 'UNNAMED_OFFICE',
    authority: input.authority ?? [],
    jurisdiction: input.jurisdiction ?? 'CONFIGURED',
    duties: input.duties ?? [],
    limits: input.limits ?? [],
    accountability: input.accountability ?? [],
    succession: input.succession ?? 'RULE_BASED',
    termPolicy: input.termPolicy ?? 'CONFIGURED',
    status: input.status ?? 'ACTIVE',
    occupant: input.occupant ?? null,
  };
}

export function assignOccupant(office, personId, startAt, endAt=null) {
  return {
    ...office,
    occupant: { personId, startAt, endAt },
  };
}
