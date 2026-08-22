import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let caseCounter = 1;

function tc(name, method, route, reqAuth, expectedStatus, extra = {}) {
  const id = `TC-${String(caseCounter++).padStart(3, '0')}`;
  return { id, name, method, route, requiresAuth: reqAuth, expectedStatus, ...extra };
}

// 1. Auth (50 cases)
const authCases = [];
authCases.push(tc('Auth - Valid Login', 'POST', '/api/v1/auth/login', false, 200, { body: { username: 'admin-ddt', password: 'password' } }));
for (let i = 0; i < 40; i++) {
  authCases.push(tc(`Auth - Invalid Login ${i}`, 'POST', '/api/v1/auth/login', false, 401, { body: { username: `user${i}`, password: 'wrong' } }));
}
authCases.push(tc('Auth - Me', 'GET', '/api/v1/auth/me', true, 200));
authCases.push(tc('Auth - Online', 'GET', '/api/v1/auth/online', true, 200));
for (let i = 0; i < 7; i++) {
  authCases.push(tc(`Auth - Missing Field Register ${i}`, 'POST', '/api/v1/auth/register', false, 400, { body: { username: `u${i}` } }));
}
fs.writeFileSync(path.join(__dirname, 'test-cases-auth.json'), JSON.stringify(authCases, null, 2));

// 2. Kernel (50 cases)
const kernelCases = [];
kernelCases.push(tc('Kernel - Health', 'GET', '/api/v1/health', false, 200, { expectedBodySubset: { ok: true } }));
kernelCases.push(tc('Kernel - Features', 'GET', '/api/v1/features', false, 200));
kernelCases.push(tc('Kernel - Graph', 'GET', '/api/v1/kernel/graph', true, 200));
kernelCases.push(tc('Kernel - Graph Integrity', 'GET', '/api/v1/kernel/graph/integrity', true, 200));
kernelCases.push(tc('Kernel - Ledger', 'GET', '/api/v1/kernel/ledger', true, 200));
kernelCases.push(tc('Kernel - Types', 'GET', '/api/v1/kernel/types', true, 200));
for (let i = 0; i < 40; i++) {
  kernelCases.push(tc(`Kernel - Model List Page ${i}`, 'GET', `/api/v1/models?limit=${i % 10 + 1}&offset=${i}`, true, 200));
}
for (let i = 0; i < 3; i++) {
  kernelCases.push(tc(`Kernel - Unknown Model Type ${i}`, 'GET', `/api/v1/models/UNKNOWN_${i}`, true, 404));
}
fs.writeFileSync(path.join(__dirname, 'test-cases-kernel.json'), JSON.stringify(kernelCases, null, 2));

// 3. Entities (100 cases)
const entityCases = [];
// Create 20 entities
for (let i = 0; i < 20; i++) {
  entityCases.push(tc(`Entity - Create Legacy ${i}`, 'POST', '/api/v1/entities', true, 201, { body: { entityId: `LEGACY-${i}`, type: 'LEGACY_TEST', data: { i } } }));
}
// Get all entities with limits
for (let i = 0; i < 30; i++) {
  entityCases.push(tc(`Entity - Get Limit ${i}`, 'GET', `/api/v1/entities?limit=${i + 1}&offset=${i % 5}`, true, 200));
}
// Get specific entities
for (let i = 0; i < 20; i++) {
  entityCases.push(tc(`Entity - Get Specific ${i}`, 'GET', `/api/v1/entities/LEGACY-${i}`, true, 200));
}
// Update entities
for (let i = 0; i < 15; i++) {
  entityCases.push(tc(`Entity - Update Specific ${i}`, 'PUT', `/api/v1/entities/LEGACY-${i}`, true, 200, { body: { type: 'LEGACY_TEST', data: { i: i * 2 } } }));
}
// Delete entities
for (let i = 15; i < 20; i++) {
  entityCases.push(tc(`Entity - Delete Specific ${i}`, 'DELETE', `/api/v1/entities/LEGACY-${i}`, true, 200));
}
// Types and Relations
for (let i = 0; i < 10; i++) {
  entityCases.push(tc(`Entity - Create Type ${i}`, 'POST', '/api/v1/types', true, 201, { body: { typeId: `TYPE_${i}`, entityFamily: 'ENTITY', definition: {} } }));
}
fs.writeFileSync(path.join(__dirname, 'test-cases-entities.json'), JSON.stringify(entityCases, null, 2));

// 4. Commands incl Workflow & Flow Engines (150 cases)
const commandCases = [];
for (let i = 0; i < 40; i++) {
  commandCases.push(tc(`Command - Create Entity ${i}`, 'POST', '/api/v1/command', true, 201, { headers: { 'idempotency-key': `create-${i}` }, body: { command: 'CREATE_ENTITY', target: `CMD-ENT-${i}`, payload: { type: 'TEST_CMD', payload: { val: i } } } }));
}
for (let i = 0; i < 30; i++) {
  commandCases.push(tc(`Command - Mutate Relation ${i}`, 'POST', '/api/v1/command', true, 201, { headers: { 'idempotency-key': `rel-${i}` }, body: { command: 'CREATE_RELATION', target: `CMD-ENT-${i}`, payload: { relationType: 'LINK', toId: `CMD-ENT-${i+1}`, payload: {} } } }));
}
for (let i = 0; i < 30; i++) {
  commandCases.push(tc(`Command - Record Event ${i}`, 'POST', '/api/v1/command', true, 201, { headers: { 'idempotency-key': `evt-${i}` }, body: { command: 'RECORD_EVENT', target: `CMD-ENT-${i}`, payload: { eventType: 'PING', payload: {} } } }));
}
// Flow Engine & Workflows tests via Commands
for (let i = 0; i < 10; i++) {
  commandCases.push(tc(`Workflow - Justice Case ${i}`, 'POST', '/api/v1/command', true, 201, { headers: { 'idempotency-key': `wf-justice-${i}` }, body: { command: 'CREATE_ENTITY', target: `JUSTICE-${i}`, payload: { type: 'JUSTICE.CASE', payload: { kind: 'REVIEW', currentStage: 'POLICE' } } } }));
}
for (let i = 0; i < 10; i++) {
  commandCases.push(tc(`Workflow - CAB Change Request ${i}`, 'POST', '/api/v1/command', true, 201, { headers: { 'idempotency-key': `wf-cab-${i}` }, body: { command: 'CREATE_ENTITY', target: `CAB-${i}`, payload: { type: 'CAB.WORKFLOW', payload: { currentStage: 'DRAFT' } } } }));
}
for (let i = 0; i < 10; i++) {
  commandCases.push(tc(`Flow Engine - Resource Flow ${i}`, 'POST', '/api/v1/command', true, 201, { headers: { 'idempotency-key': `flow-res-${i}` }, body: { command: 'RECORD_EVENT', target: `JUSTICE-${i}`, payload: { eventType: 'FINANCE.ZAKAT', payload: { amount: 1000 } } } }));
}
// Invalid Commands
for (let i = 0; i < 20; i++) {
  commandCases.push(tc(`Command - Invalid Command Type ${i}`, 'POST', '/api/v1/command', true, 400, { headers: { 'idempotency-key': `inv-${i}` }, body: { command: 'UNKNOWN_BLAH', payload: {} } }));
}
fs.writeFileSync(path.join(__dirname, 'test-cases-commands.json'), JSON.stringify(commandCases, null, 2));

// 5. Observability & AI (100 cases)
const obsCases = [];
for (let i = 0; i < 20; i++) {
  obsCases.push(tc(`Obs - Observe Event ${i}`, 'POST', '/api/v1/observe', true, 200, { body: { entityId: `OBS-${i}`, source: `TEST-${i}`, payload: { val: i } } }));
}
for (let i = 0; i < 20; i++) {
  obsCases.push(tc(`Obs - Analyze Event ${i}`, 'POST', '/api/v1/analyze', true, 200, { body: { caseId: `OBS-${i}`, text: `Analyze text ${i}` } }));
}
for (let i = 0; i < 10; i++) {
  obsCases.push(tc(`Obs - Evaluate Event ${i}`, 'POST', '/api/v1/evaluate', true, 200, { body: { caseId: `OBS-${i}`, text: 'eval', criteria: ['test'] } }));
}
for (let i = 0; i < 20; i++) {
  obsCases.push(tc(`Obs - Resource Audit ${i}`, 'GET', `/api/v1/resource/OBS-${i}/audit`, true, 200));
}
for (let i = 0; i < 10; i++) {
  obsCases.push(tc(`Obs - AI Analyze ${i}`, 'POST', '/api/v1/ai/analyze', true, 200, { body: { text: `Hello world ${i}` } }));
}
for (let i = 0; i < 10; i++) {
  obsCases.push(tc(`Query - Entity ${i}`, 'POST', '/api/v1/query', true, 200, { body: { entityId: `OBS-${i}` } }));
}
for (let i = 0; i < 10; i++) {
  obsCases.push(tc(`Metrics & Registry ${i}`, 'GET', i % 2 === 0 ? '/api/v1/metrics' : '/api/v1/semantic/registry', true, 200));
}
fs.writeFileSync(path.join(__dirname, 'test-cases-observability.json'), JSON.stringify(obsCases, null, 2));

// 6. Edge Cases (50 cases)
const edgeCases = [];
for (let i = 0; i < 25; i++) {
  edgeCases.push(tc(`Edge - 404 Route ${i}`, 'GET', `/api/v1/does-not-exist-${i}`, false, 404));
}
for (let i = 0; i < 25; i++) {
  edgeCases.push(tc(`Edge - 404 Method ${i}`, 'POST', '/api/v1/health', false, 404, { body: {} }));
}
fs.writeFileSync(path.join(__dirname, 'test-cases-edge.json'), JSON.stringify(edgeCases, null, 2));

// 7. Flow Engines & Workflows (500 cases)
const engineCases = [];

// Justice Workflow (150 cases)
for (let i = 0; i < 50; i++) {
  engineCases.push(tc(`Engine Justice - Create Case ${i}`, 'POST', '/api/v1/command', true, 201, { headers: { 'idempotency-key': `eng-justice-create-${i}` }, body: { command: 'CREATE_ENTITY', target: `ENG-JUSTICE-${i}`, payload: { type: 'JUSTICE.CASE', payload: { kind: 'REVIEW', currentStage: 'POLICE' } } } }));
  engineCases.push(tc(`Engine Justice - Mutate Relation ${i}`, 'POST', '/api/v1/command', true, 201, { headers: { 'idempotency-key': `eng-justice-rel-${i}` }, body: { command: 'CREATE_RELATION', target: `ENG-JUSTICE-${i}`, payload: { relationType: 'INVOLVES', toId: `ACTOR-${i}`, payload: {} } } }));
  engineCases.push(tc(`Engine Justice - Record Event ${i}`, 'POST', '/api/v1/command', true, 201, { headers: { 'idempotency-key': `eng-justice-evt-${i}` }, body: { command: 'RECORD_EVENT', target: `ENG-JUSTICE-${i}`, payload: { eventType: 'CASE_UPDATED', payload: { stage: 'PROSECUTOR' } } } }));
}

// CAB Workflow (150 cases)
for (let i = 0; i < 50; i++) {
  engineCases.push(tc(`Engine CAB - Create Workflow ${i}`, 'POST', '/api/v1/command', true, 201, { headers: { 'idempotency-key': `eng-cab-create-${i}` }, body: { command: 'CREATE_ENTITY', target: `ENG-CAB-${i}`, payload: { type: 'CAB.WORKFLOW', payload: { currentStage: 'DRAFT', kind: 'KNOWLEDGE.SHARE' } } } }));
  engineCases.push(tc(`Engine CAB - Request Clarification ${i}`, 'POST', '/api/v1/command', true, 201, { headers: { 'idempotency-key': `eng-cab-clarify-${i}` }, body: { command: 'RECORD_EVENT', target: `ENG-CAB-${i}`, payload: { eventType: 'CAB.CLARIFICATION', payload: { message: 'Need details' } } } }));
  engineCases.push(tc(`Engine CAB - Move Stage ${i}`, 'POST', '/api/v1/command', true, 201, { headers: { 'idempotency-key': `eng-cab-stage-${i}` }, body: { command: 'RECORD_EVENT', target: `ENG-CAB-${i}`, payload: { eventType: 'STAGE_CHANGED', payload: { nextStage: 'SOURCE_CHECK' } } } }));
}

// Resource Flow & Finance (100 cases)
for (let i = 0; i < 50; i++) {
  engineCases.push(tc(`Engine Flow - Zakat ${i}`, 'POST', '/api/v1/command', true, 201, { headers: { 'idempotency-key': `eng-flow-zakat-${i}` }, body: { command: 'RECORD_EVENT', target: `ENG-CAB-${i}`, payload: { eventType: 'FINANCE.ZAKAT', payload: { amount: 1000 } } } }));
  engineCases.push(tc(`Engine Flow - Salary ${i}`, 'POST', '/api/v1/command', true, 201, { headers: { 'idempotency-key': `eng-flow-salary-${i}` }, body: { command: 'RECORD_EVENT', target: `ACTOR-${i}`, payload: { eventType: 'EMPLOYMENT.SALARY', payload: { amount: 5000 } } } }));
}

// Mode Engine & Lifecycle (100 cases)
for (let i = 0; i < 100; i++) {
  engineCases.push(tc(`Engine Mode - Publish ${i}`, 'POST', '/api/v1/command', true, 201, { headers: { 'idempotency-key': `eng-mode-${i}` }, body: { command: 'RECORD_EVENT', target: `ENG-CAB-${i % 50}`, payload: { eventType: 'PUBLICATION_STATE', payload: { next: 'PUBLISHED' } } } }));
}

fs.writeFileSync(path.join(__dirname, 'test-cases-engines.json'), JSON.stringify(engineCases, null, 2));

console.log(`Generated ${caseCounter - 1} test cases across multiple JSON files.`);
