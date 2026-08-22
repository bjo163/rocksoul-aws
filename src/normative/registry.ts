import { createTypePack } from '../kernel/type-pack.js';

export const normativeTypePacks = [
  createTypePack({typeId:'NORMATIVE.RELIGIOUS_RULE', entityFamily:'RULE', domain:'RELIGIOUS'}),
  createTypePack({typeId:'NORMATIVE.CIVIC_RULE', entityFamily:'RULE', domain:'CIVIC'}),
  createTypePack({typeId:'NORMATIVE.ETHICAL_RULE', entityFamily:'RULE', domain:'ETHICAL'}),
  createTypePack({typeId:'NORMATIVE.HEALTH_RULE', entityFamily:'RULE', domain:'HEALTH'}),
  createTypePack({typeId:'NORMATIVE.ECONOMIC_RULE', entityFamily:'RULE', domain:'ECONOMIC'}),
  createTypePack({typeId:'NORMATIVE.PROFESSIONAL_RULE', entityFamily:'RULE', domain:'PROFESSIONAL'}),
  createTypePack({typeId:'NORMATIVE.INTERNATIONAL_RULE', entityFamily:'RULE', domain:'INTERNATIONAL'})
];
