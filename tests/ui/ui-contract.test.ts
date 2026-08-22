import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const app=fs.readFileSync('apps/cab/src/App.tsx','utf8');
const api=fs.readFileSync('apps/cab/src/lib/api.ts','utf8');
test('ui has login/register/logout/session',()=>{ for(const s of ['login','register','logout','api.login','api.register','api.me','api.logout']) assert.ok(app.includes(s)||api.includes(s),s); });
test('ui has canonical menu',()=>{ for(const s of ['CAB','SHADOW','HEROES','MISSIONS','PROJECTS','KNOWLEDGE','ASMA','MĪZĀN','AUDIT']) assert.ok(app.includes(s),s); });
test('ui has versioned prophet API',()=>assert.ok(api.includes('/api/v1/prophets')));
