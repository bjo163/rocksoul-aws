import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const backup = fs.readFileSync('scripts/db-backup.ts', 'utf8');
const restore = fs.readFileSync('scripts/db-restore.ts', 'utf8');

test('postgres backup uses custom pg_dump format and never invokes a shell', () => {
  assert.match(backup, /pg_dump/);
  assert.match(backup, /--format=custom/);
  assert.match(backup, /shell:\s*false/);
  assert.match(backup, /spawn\(command, args/);
});

test('postgres restore is explicit, custom-format, and ownership-safe', () => {
  assert.match(restore, /pg_restore/);
  assert.match(restore, /--format=custom/);
  assert.match(restore, /--clean/);
  assert.match(restore, /--if-exists/);
  assert.match(restore, /--no-owner/);
  assert.match(restore, /--no-privileges/);
  assert.match(restore, /shell:\s*false/);
});

test('restore refuses to run without an explicit source path', () => {
  assert.match(restore, /if \(!source\) throw new Error\('Usage: db-restore --source=BACKUP_PATH/);
});

test('postgres restore requires an explicit destructive-operation acknowledgement', () => {
  assert.match(restore, /POSTGRES_RESTORE_REQUIRES_ALLOW_DESTRUCTIVE/);
  assert.match(restore, /--allow-destructive/);
});
