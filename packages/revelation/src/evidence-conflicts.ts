export type EvidenceGraphRelation =
  | 'CORROBORATES'
  | 'CONFLICTS_WITH';

export type EvidenceGraphRelationRecord = {
  id: string;
  fromEvidenceId: string;
  toEvidenceId: string;
  relation: EvidenceGraphRelation;
  grounding: 'CORROBORATIVE' | 'CONFLICTED';
  symmetric: true;
};

type EvidenceInput = {
  evidenceId: string;
  class?: string;
  grounding?: string;
  reference?: string;
  superseded?: boolean;
};

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function refKey(value: EvidenceInput): string | undefined {
  return text(value.reference)?.trim().toUpperCase();
}

export function buildEvidenceConflictGraph(records: EvidenceInput[]): EvidenceGraphRelationRecord[] {
  const active = records.filter((item) => !item.superseded && text(item.evidenceId));
  const relations = new Map<string, EvidenceGraphRelationRecord>();

  for (let index = 0; index < active.length; index += 1) {
    for (let otherIndex = index + 1; otherIndex < active.length; otherIndex += 1) {
      const left = active[index];
      const right = active[otherIndex];
      const leftReference = refKey(left);
      const rightReference = refKey(right);
      if (!leftReference || leftReference !== rightReference) continue;

      const leftClass = text(left.class) ?? 'UNKNOWN';
      const rightClass = text(right.class) ?? 'UNKNOWN';
      const leftGrounding = text(left.grounding) ?? 'UNKNOWN';
      const rightGrounding = text(right.grounding) ?? 'UNKNOWN';

      const leftCorroborative = leftClass === 'TEXTUAL_WITNESS_CORROBORATION' && leftGrounding === 'CORROBORATIVE';
      const rightCorroborative = rightClass === 'TEXTUAL_WITNESS_CORROBORATION' && rightGrounding === 'CORROBORATIVE';
      const conflict = leftClass === 'CONFLICTED' || rightClass === 'CONFLICTED';

      if (!leftCorroborative && !rightCorroborative && !conflict) continue;

      const relation: EvidenceGraphRelation = conflict ? 'CONFLICTS_WITH' : 'CORROBORATES';
      const grounding = conflict ? 'CONFLICTED' : 'CORROBORATIVE';
      const a = left.evidenceId < right.evidenceId ? left.evidenceId : right.evidenceId;
      const b = left.evidenceId < right.evidenceId ? right.evidenceId : left.evidenceId;
      const id = `EGRAPH-${relation}-${a}-${b}`;
      relations.set(id, { id, fromEvidenceId: a, toEvidenceId: b, relation, grounding, symmetric: true });
    }
  }

  return [...relations.values()].sort((a, b) => a.id.localeCompare(b.id));
}
