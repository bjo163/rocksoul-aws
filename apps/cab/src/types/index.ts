export type ModelField = {
  name: string;
  label: string;
  kind: string;
  path: string;
};

export type UIModel = {
  typeId: string;
  title: string;
  family: string;
  route: string;
  layout: string;
  sections: string[];
  fields: ModelField[];
  capabilities: { create: boolean; read: boolean; update: boolean; delete: boolean; relations: boolean; events: boolean; audit: boolean };
};

export type Model = { typeId: string; label?: string; domain?: string; entityFamily?: string; ui: UIModel };


export type AnalysisNode = {
  value?: number;
  label?: string;
  status?: string;
  confidence?: number;
  evidence_refs?: string[];
  evidence?: unknown[];
};

export type RgblChain = Partial<Record<'R' | 'G' | 'B' | 'L', AnalysisNode>>;

export type AnalysisResult = {
  caseId?: string;
  text?: string;
  status?: string;
  domain?: unknown;
  intention?: { chain?: RgblChain; status?: string };
  semantic?: { rgbl?: RgblChain; actionGateVector?: number[]; impactVector?: number[]; confidence?: number };
  actionGateVector?: number[];
  impactVector?: number[];
  timeFactor?: unknown;
  causality?: unknown;
  evidence?: { items?: unknown[]; [key: string]: unknown } | unknown[];
  mizan?: {
    score?: number;
    accountabilityScore?: number;
    band?: string;
    trace?: unknown[] | { stages?: unknown[] };
    [key: string]: unknown;
  };
  lifecycle?: unknown;
  caseLifecycle?: unknown;
  final?: { state?: string; destination?: string; divineVerdict?: string };
  alternatives?: unknown[];
  conflicts?: unknown[];
  reviewGate?: HumanReviewGate;
  [key: string]: unknown;
};
import type { HumanReviewGate } from '@moonwitness/contracts';
