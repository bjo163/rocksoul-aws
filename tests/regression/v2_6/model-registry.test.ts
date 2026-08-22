// @ts-nocheck
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createBackend } from '../../../src/backend/bootstrap.js';

test('model registry builds reusable UI schema', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'mw-model-'));
  const backend = createBackend({dataDir: dir});
  const models = backend.models.list();
  assert.ok(models.length > 0);
  const first = models[0];
  assert.ok(first.ui);
  assert.equal(first.ui.capabilities.create, true);
  const page = backend.models.pageModel(first.typeId);
  assert.equal(page.type.typeId, first.typeId);
  assert.match(page.ui.route, /^\/m\//);
  await fs.rm(dir, {recursive:true, force:true});
});

test('new type automatically receives model-driven UI', () => {
  const backend = createBackend({dataDir: os.tmpdir()});
  const typeId = 'TEST.GENERATED_ENTITY';
  const created = backend.models.define({
    departmentId: 'TEST',
    typeId,
    entityFamily: 'ENTITY',
    label: 'Generated Entity',
    fields: [{name:'name',label:'Name',kind:'text',path:'data.name'}]
  });
  assert.equal(created.typeId, typeId);
  assert.equal(created.ui.title, 'Generated Entity');
  assert.equal(created.ui.fields[0].name, 'name');
});
