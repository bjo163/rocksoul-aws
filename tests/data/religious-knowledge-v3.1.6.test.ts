// @ts-nocheck
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const ROOT = process.cwd();
const read = p => JSON.parse(fs.readFileSync(path.join(ROOT,p),'utf8'));
const baseFields=['id','type','schemaVersion','version','createdAt','createdBy','updatedAt','updatedBy','status','visibility','provenance','metadata','data'];
const prophets=read('data/prophets.json');
assert.equal(prophets.length,25);
for (const p of prophets) for (const k of ['id','name','order','type','metadata']) assert.ok(p[k] !== undefined, `prophet missing ${k}`);
assert.equal(new Set(prophets.map(p=>p.id)).size,25);
const hadith=read('data/knowledge/hadith-collections.json'); assert.ok(hadith.length>=9);
const terms=read('data/knowledge/religious-terms.json'); assert.ok(terms.length>=40);
const events=read('data/knowledge/prophetic-events.json'); assert.ok(events.length>=15);
const rels=read('data/knowledge/cross-source-relations.json'); assert.ok(rels.length>=10);
for (const file of ['data/knowledge/hadith-collections.json','data/knowledge/religious-terms.json','data/knowledge/prophetic-events.json','data/knowledge/cross-source-relations.json','data/knowledge/prophet-scripture-index.json']) {
 const rows=read(file); for (const r of rows) for (const k of baseFields) assert.ok(r[k] !== undefined, `${file} missing ${k}`);
}
console.log('v3.1.6 religious knowledge PASS');
