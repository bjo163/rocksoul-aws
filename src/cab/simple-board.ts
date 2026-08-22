// @ts-nocheck
import { createBaseModel } from '../models/base-model.js';

export function createCabBoard({ id, mission, operatorRid, heroReferenceId = null, createdBy = operatorRid }) {
  return createBaseModel({
    id,
    type: 'CAB.BOARD',
    createdBy,
    data: {
      mission,
      shadowId: operatorRid,
      heroReferenceId,
    },
  });
}
