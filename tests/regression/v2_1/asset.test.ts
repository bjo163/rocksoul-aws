// @ts-nocheck
import assert from 'node:assert/strict';
import {TypeRegistry, EntityStore, RelationStore, EventStore, StateStore} from '../../../src/kernel/index.js';
import {UniversalAssetRegistry} from '../../../src/asset/index.js';

const tr = new TypeRegistry();
const entities = new EntityStore();
const relations = new RelationStore();
const events = new EventStore();
const states = new StateStore();
const assets = new UniversalAssetRegistry({entities,relations,events,states,typeRegistry:tr});

const person = entities.create({entityId:'RID_ASSET_TEST', type:'PERSON', data:{rid:'RID_ASSET_TEST', personId:'PERSON_ASSET_TEST'}});
const project = entities.create({entityId:'PROJECT_ASSET_TEST', type:'PROJECT'});
const place = entities.create({entityId:'IDN.TEST.LOCATION', type:'PLACE'});
const budget = entities.create({entityId:'BUDGET_ASSET_TEST', type:'RESOURCE.BUDGET'});

const asset = assets.createAsset({rid:person.entityId,type:'INFRASTRUCTURE',name:'Bridge Test',value:50000000000,ownerId:person.entityId,projectId:project.entityId,locationId:place.entityId});
assert.equal(asset.assetId.startsWith('ASSET_'), true);
assert.equal(relations.query({from:person.entityId,type:'OWNS',to:asset.assetId}).length, 1);
assert.equal(relations.query({from:asset.assetId,type:'LOCATED_AT',to:place.entityId}).length, 1);

assets.linkInfrastructure({assetId:asset.assetId,budgetId:budget.entityId,operatorId:'ORG_OPERATOR'});
assert.equal(relations.query({from:asset.assetId,type:'FUNDED_BY',to:budget.entityId}).length, 1);

const transitioned = assets.transition(asset.assetId,'OPERATING');
assert.equal(transitioned.status,'OPERATING');
assert.equal(states.get(asset.assetId).state,'OPERATING');

const cost = assets.lifecycleCost(asset.assetId,{capex:50,opex:10,maintenance:5,decommissioning:2});
assert.equal(cost.lifecycleCost,67);

const risk = assets.riskProfile(asset.assetId,{structural:.2,financial:.8,environment:.4});
assert.equal(risk.band,'MEDIUM');

assets.updateValue(asset.assetId,55000000000,'REVALUATION');
assert.equal(assets.get(asset.assetId).value,55000000000);
assert.ok(events.list({subject:asset.assetId}).length >= 4);
console.log('PASS: universal asset registry + infrastructure lifecycle + relation integration');
