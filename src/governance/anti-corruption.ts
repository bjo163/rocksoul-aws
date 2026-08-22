// @ts-nocheck
export function createOfficeIntegrityRecord(input={}) {
  return {
    officeId: input.officeId,
    assetDeclaration: input.assetDeclaration ?? null,
    conflicts: input.conflicts ?? [],
    procurementLinks: input.procurementLinks ?? [],
    gifts: input.gifts ?? [],
    recusal: input.recusal ?? false,
    auditStatus: input.auditStatus ?? 'PENDING',
    publicDisclosure: input.publicDisclosure ?? false
  };
}
